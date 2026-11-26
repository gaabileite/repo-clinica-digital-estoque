import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type ReceiptOrigin as DbReceiptOrigin } from '@prisma/client';
import type { AuthContext } from '../access/auth-context';
import { catalogTransaction } from '../common/catalog-transaction';
import { notImplemented } from '../common/not-implemented';
import { IDEMPOTENCY_RETENTION_MS, storageKey } from '../common/idempotency/idempotency';
import { dec, toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import { REQUESTS_ADAPTER, type RequestsAdapter } from '../integrations/requests/requests.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso, dateColumnToCivil } from '../stock/civil-date';
import { CreateReceiptDto, type ReceiptOrigin } from './dto/create-receipt.dto';
import type { ReceiptDto, ReceiptLineResultDto } from './dto/receipt-response.dto';
import { validateReceiptHeader, validateReceiptLine, type FieldErrors } from './receipt-rules';

const toDbOrigin = (origin: ReceiptOrigin): DbReceiptOrigin => origin.toUpperCase().replace(/-/g, '_') as DbReceiptOrigin;
const fromDbOrigin = (origin: DbReceiptOrigin): ReceiptOrigin => origin.toLowerCase().replace(/_/g, '-') as ReceiptOrigin;
const civilDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const invalid = (code: string, detail: string, errors: FieldErrors) => new UnprocessableEntityException({ code, detail, errors });

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
    @Inject(REQUESTS_ADAPTER) private readonly requests: RequestsAdapter,
  ) {}

  /**
   * E-27 (E5-H1, RF-18): registra a entrada por origem, emite a nota de recebimento e soma o saldo nos lotes.
   * Numa transação: valida o cabeçalho e as linhas, cria o lote que não existe (ou soma no existente), grava um
   * lançamento de entrada por linha no livro, a nota numerada (NR-0001, sequencial por clínica) e os eventos.
   * A data do pedido, quando há, alimenta o tempo de reposição medido (RN-03).
   */
  async create(clinicId: string, auth: AuthContext, idempotencyKey: string, body: CreateReceiptDto): Promise<ReceiptDto> {
    const today = civilToIso(civilToday());
    const ledgerKey = storageKey(auth.userId, idempotencyKey);

    let requestedOn: string | undefined;
    if (body.requestId) {
      const request = await this.requests.getRequest(body.requestId);
      if (!request || request.clinicId !== clinicId) {
        throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Requisição não encontrada para esta clínica.' });
      }
      requestedOn = request.requestedOn;
    }

    const header = validateReceiptHeader({ ...body, requestedOn }, today);
    if (!header.ok) throw invalid(header.code, header.detail, header.errors);

    try {
      // catalogTransaction trava a clínica: as entradas dela andam uma por vez (número da nota e criação de lotes).
      return await catalogTransaction(this.prisma, clinicId, async (tx) => {
        const codes = [...new Set(body.lines.map((l) => l.code.trim().toUpperCase()))];
        const items = await tx.item.findMany({
          where: { clinicId, code: { in: codes, mode: 'insensitive' } },
          select: { id: true, code: true, name: true, unit: true, active: true, tracksLotAndExpiry: true },
        });
        const byCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));

        const errors: FieldErrors = {};
        const resolved = body.lines.map((line, index) => {
          const item = byCode.get(line.code.trim().toUpperCase());
          if (!item) {
            throw new NotFoundException({ code: 'STOCK_CODE_NOT_FOUND', detail: `Não há insumo com o código ${line.code} nesta clínica (linha ${index + 1}).` });
          }
          if (!item.active) {
            throw new UnprocessableEntityException({ code: 'STOCK_ITEM_INACTIVE', detail: `O insumo ${item.code} está inativo (linha ${index + 1}).` });
          }
          const lot = validateReceiptLine({ tracksLotAndExpiry: item.tracksLotAndExpiry, lotCode: line.lotCode, expiresOn: line.expiresOn }, `lines[${index}]`);
          if (!lot.ok) Object.assign(errors, lot.errors);
          return { line, item, lot };
        });
        if (Object.keys(errors).length > 0) {
          throw invalid('STOCK_LOT_REQUIRED', 'Insumo com controle de lote exige lote e validade em cada linha.', errors);
        }

        const clinic = await tx.clinic.update({ where: { id: clinicId }, data: { receiptSeq: { increment: 1 } }, select: { receiptSeq: true } });
        const receipt = await tx.receipt.create({
          data: {
            number: `NR-${String(clinic.receiptSeq).padStart(4, '0')}`,
            clinicId,
            origin: toDbOrigin(body.origin),
            originClinicId: body.origin === 'other-clinic' ? (body.originClinicId ?? null) : null,
            description: body.description?.trim() || null,
            donorLetterFileId: body.donorLetterFileId?.trim() || null,
            proofFileId: body.proofFileId?.trim() || null,
            orderedOn: header.header.orderedOn ? civilDate(header.header.orderedOn) : null,
            receivedOn: civilDate(header.header.receivedOn),
            userId: auth.userId,
          },
        });

        const lines: ReceiptLineResultDto[] = [];
        const touched = new Set<string>();
        for (const [index, { line, item, lot }] of resolved.entries()) {
          if (!lot.ok) continue; // já tratado acima; só estreita o tipo
          const quantity = dec(line.receivedQuantity);
          const expiresOn = lot.expiresOn ? civilDate(lot.expiresOn) : null;

          // Mesmo lote do insumo: soma no existente (a validade tem que bater); senão cria.
          const existing = await tx.lot.findFirst({ where: { clinicId, itemId: item.id, lotCode: lot.lotCode } });
          let lotId: string;
          let lotCreated = false;
          if (existing) {
            if (dateColumnToCivil(existing.expiresOn) !== lot.expiresOn) {
              throw invalid('STOCK_LOT_EXPIRY_MISMATCH', `O lote ${lot.lotCode} já existe com outra validade (${dateColumnToCivil(existing.expiresOn) ?? 'sem validade'}).`, {
                [`lines[${index}].expiresOn`]: [`O lote ${lot.lotCode} já existe com a validade ${dateColumnToCivil(existing.expiresOn) ?? 'sem validade'}. Use outro código de lote.`],
              });
            }
            await tx.lot.update({ where: { id: existing.id }, data: { quantity: { increment: quantity.toFixed(3) } } });
            lotId = existing.id;
          } else {
            lotId = (await tx.lot.create({ data: { clinicId, itemId: item.id, lotCode: lot.lotCode, expiresOn, quantity: quantity.toFixed(3) }, select: { id: true } })).id;
            lotCreated = true;
          }

          const created = await tx.receiptLine.create({
            data: { receiptId: receipt.id, itemId: item.id, receivedQuantity: quantity.toFixed(3), lotCode: lot.lotCode, expiresOn, lotId },
          });
          // Lote e validade ficam copiados no lançamento (RNF-14).
          // O lote continua travado pelo update/create até o commit.
          const priorCount = await tx.movement.count({ where: { lotId } });
          const movement = await tx.movement.create({
            data: {
              clinicId,
              itemId: item.id,
              lotId,
              lotCode: lot.lotCode,
              expiresOn,
              kind: 'ENTRY',
              receiptId: receipt.id,
              lotMovementCount: priorCount + 1,
              quantity: quantity.toFixed(3),
              userId: auth.userId,
              origin: body.origin,
              idempotencyKey: `${ledgerKey}#${index}`,
            },
            select: { id: true, occurredAt: true },
          });
          await this.events.publish(
            'stock.movement.recorded',
            `${clinicId}:${item.id}`,
            {
              movementId: movement.id,
              clinicId,
              itemId: item.id,
              lotId,
              kind: 'entry',
              quantity: quantity.toFixed(3),
              receiptId: receipt.id,
              userId: auth.userId,
              occurredAt: movement.occurredAt.toISOString(),
            },
            { clinicId, tx },
          );
          touched.add(item.id);
          lines.push({
            id: created.id,
            item: { id: item.id, code: item.code, name: item.name, unit: item.unit },
            receivedQuantity: toQuantityString(quantity),
            lotCode: lot.lotCode,
            expiresOn: lot.expiresOn,
            lotId,
            lotCreated,
            movementId: movement.id,
            balance: '0.000',
          });
        }

        // Saldo total de cada insumo depois de todas as linhas.
        const lotTotals = await tx.lot.groupBy({ by: ['itemId'], where: { clinicId, itemId: { in: [...touched] } }, _sum: { quantity: true } });
        const balances = new Map(lotTotals.map((t) => [t.itemId, dec(t._sum.quantity ?? 0)]));
        for (const line of lines) line.balance = toQuantityString(balances.get(line.item.id) ?? dec(0));

        await this.events.publish(
          'stock.receipt.completed',
          `${clinicId}:${receipt.id}`,
          {
            receiptId: receipt.id,
            number: receipt.number,
            clinicId,
            origin: body.origin,
            orderedOn: header.header.orderedOn,
            receivedOn: header.header.receivedOn,
            lines: lines.map((l) => ({ itemId: l.item.id, lotId: l.lotId, quantity: l.receivedQuantity })),
          },
          { clinicId, tx },
        );

        return {
          id: receipt.id,
          number: receipt.number,
          origin: fromDbOrigin(receipt.origin),
          originClinicId: receipt.originClinicId,
          description: receipt.description,
          donorLetterFileId: receipt.donorLetterFileId,
          proofFileId: receipt.proofFileId,
          orderedOn: dateColumnToCivil(receipt.orderedOn),
          receivedOn: header.header.receivedOn,
          userId: receipt.userId,
          createdAt: receipt.createdAt.toISOString(),
          lines,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: 'Já existe um lançamento com esta Idempotency-Key. Se a entrada ainda está em andamento, aguarde; senão, use uma chave nova.',
        });
      }
      throw error;
    }
  }
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-28', 'Lista notas de recebimento');
  }
  detail(_clinicId: string, _receiptId: string): Promise<never> {
    return notImplemented('E-29', 'Detalhe da nota, linhas e divergências');
  }
  document(_clinicId: string, _receiptId: string): Promise<never> {
    return notImplemented('E-30', 'PDF da nota (URL assinada do módulo de Arquivos)');
  }
  async reverse(clinicId: string, receiptId: string, userId: string, recordKey: string, hash: string, justification: string) {
    const reason = justification.trim();
    if (!reason) throw new UnprocessableEntityException({ code: 'STOCK_JUSTIFICATION_REQUIRED', detail: 'Informe o motivo do estorno.' });

    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      const previous = await tx.idempotencyRecord.findUnique({ where: { key: recordKey } });
      if (previous && Date.now() - previous.createdAt.getTime() <= IDEMPOTENCY_RETENTION_MS) {
        if (previous.requestHash !== hash) throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_CONFLICT', detail: 'Chave já usada com outro conteúdo.' });
        return;
      }
      if (previous) await tx.idempotencyRecord.delete({ where: { key: recordKey } });
      const receipt = await tx.receipt.findFirst({ where: { id: receiptId, clinicId }, include: { lines: true } });
      if (!receipt) throw new NotFoundException({ detail: 'Nota não encontrada nesta clínica.' });
      if (receipt.reversedAt) throw new ConflictException({ code: 'STOCK_REVERSAL_NOT_ALLOWED', detail: 'Nota já estornada.' });
      const moved = () => new ConflictException({ code: 'STOCK_RECEIPT_LOT_MOVED', detail: 'Não foi possível confirmar que todos os lotes da nota estão intactos.' });
      const entries = await tx.movement.findMany({ where: { receiptId, clinicId, kind: 'ENTRY' }, orderBy: { id: 'asc' } });
      if (!entries.length || entries.length !== receipt.lines.length) throw moved();

      const checkpoints = new Map<string, number>();
      for (const entry of entries) {
        if (!entry.lotId || entry.lotMovementCount === null) throw moved();
        checkpoints.set(entry.lotId, Math.max(checkpoints.get(entry.lotId) ?? 0, entry.lotMovementCount));
      }
      // Mesma ordem em toda a transação. Retiradas e ajustes concorrentes também travam os lotes.
      const ids = [...checkpoints.keys()].sort();
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM lots WHERE "clinicId" = ${clinicId}::uuid AND id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})
        ORDER BY id FOR UPDATE
      `);
      if (locked.length !== ids.length) throw moved();
      const counts = await tx.movement.groupBy({ by: ['lotId'], where: { lotId: { in: ids } }, _count: { _all: true } });
      if (counts.some(row => row._count._all !== checkpoints.get(row.lotId!))) throw moved();

      for (const entry of entries) {
        const lotId = entry.lotId!;
        const changed = await tx.lot.updateMany({ where: { id: lotId, clinicId, quantity: { gte: entry.quantity } }, data: { quantity: { decrement: entry.quantity } } });
        if (!changed.count) throw moved();
        const reversal = await tx.movement.create({ data: {
          clinicId, itemId: entry.itemId, lotId, lotCode: entry.lotCode, expiresOn: entry.expiresOn,
          kind: 'REVERSAL', quantity: entry.quantity.negated(), reason, userId, origin: 'manual', reversalOfId: entry.id,
        } });
        await this.events.publish('stock.movement.recorded', `${clinicId}:${entry.itemId}`, {
          clinicId, receiptId, movementId: reversal.id, itemId: entry.itemId, lotId, kind: 'reversal',
          quantity: toQuantityString(reversal.quantity), reversalOfId: entry.id, userId, occurredAt: reversal.occurredAt.toISOString(),
        }, { clinicId, tx });
      }
      const reversedAt = new Date();
      await tx.receipt.update({ where: { id: receiptId }, data: { reversedAt, reversalReason: reason } });
      const after = { receiptId, clinicId, number: receipt.number, userId, justification: reason, reversedAt: reversedAt.toISOString() };
      await tx.auditEntry.create({ data: { clinicId, userId, action: 'reverse', entity: 'receipt', entityId: receiptId, after } });
      await this.events.publish('stock.receipt.reversed', `${clinicId}:${receiptId}`, after, { clinicId, tx });
      await tx.idempotencyRecord.create({ data: { key: recordKey, requestHash: hash, response: { status: 201, body: null } } });
    });
  }
  pendingRequests(_clinicId: string): Promise<never> {
    return notImplemented('E-32', 'Requisições em aberto para importar a data do pedido');
  }
}
