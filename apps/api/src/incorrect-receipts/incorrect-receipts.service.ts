import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type IncorrectReceipt } from '@prisma/client';
import type { AuthContext } from '../access/auth-context';
import { storageKey } from '../common/idempotency/idempotency';
import { dec, toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso, dateColumnToCivil } from '../stock/civil-date';
import type { IncorrectReceiptDto, IncorporationDto } from './dto/incorrect-receipt-responses.dto';
import type {
  CreateIncorrectReceiptDto,
  DiscardIncorrectReceiptDto,
  ExchangeIncorrectReceiptDto,
  IncorporateIncorrectReceiptDto,
} from './dto/incorrect-receipt-requests.dto';
import { DEFAULT_DEADLINE_DAYS, describeIncorrectReceipt, isDeadlineReached, isValidCivilDate } from './incorrect-receipt-rules';

type FieldErrors = Record<string, string[]>;

const civilDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const invalid = (errors: FieldErrors) =>
  new UnprocessableEntityException({ code: 'VALIDATION_ERROR', detail: 'Um ou mais campos precisam ser corrigidos.', errors });

const closedError = () =>
  new ConflictException({
    code: 'STOCK_INCORRECT_RECEIPT_CLOSED',
    detail: 'Este recebimento incorreto já foi resolvido (troca, incorporação ou descarte).',
  });

function toDto(row: IncorrectReceipt, today: string, deadlineDays: number): IncorrectReceiptDto {
  const notifiedOn = dateColumnToCivil(row.notifiedOn) as string;
  const resolvedOn = dateColumnToCivil(row.resolvedOn);
  const view = describeIncorrectReceipt({ status: row.status, notifiedOn, resolvedOn, today, deadlineDays });
  return {
    id: row.id,
    description: row.description,
    quantity: toQuantityString(row.quantity),
    unit: row.unit,
    supplier: row.supplier,
    notifiedOn,
    note: row.note,
    status: view.status,
    daysSinceNotified: view.daysSinceNotified,
    deadlineDays,
    daysRemaining: view.daysRemaining,
    resolvedOn,
    justification: row.justification,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class IncorrectReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  /** E-34: open records first (the oldest notification on top), then the closed ones, newest first. */
  async list(clinicId: string): Promise<IncorrectReceiptDto[]> {
    await this.assertClinicExists(clinicId);
    const [rows, deadlineDays] = await Promise.all([
      this.prisma.incorrectReceipt.findMany({ where: { clinicId } }),
      this.deadlineDays(),
    ]);
    const today = civilToIso(civilToday());
    const open = rows
      .filter((row) => row.status === 'AWAITING_EXCHANGE')
      .sort((a, b) => a.notifiedOn.getTime() - b.notifiedOn.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
    const closed = rows
      .filter((row) => row.status !== 'AWAITING_EXCHANGE')
      .sort((a, b) => (b.resolvedOn?.getTime() ?? 0) - (a.resolvedOn?.getTime() ?? 0));
    return [...open, ...closed].map((row) => toDto(row, today, deadlineDays));
  }

  /** E-35 (RF-25): registers a product received wrong that the supplier has not exchanged yet. */
  async create(clinicId: string, auth: AuthContext, body: CreateIncorrectReceiptDto): Promise<IncorrectReceiptDto> {
    await this.assertClinicExists(clinicId);
    const today = civilToIso(civilToday());
    if (!isValidCivilDate(body.notifiedOn)) throw invalid({ notifiedOn: ['Data inválida.'] });
    if (body.notifiedOn > today) throw invalid({ notifiedOn: ['A data da notificação não pode ser futura.'] });
    const deadlineDays = await this.deadlineDays();

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.incorrectReceipt.create({
        data: {
          clinicId,
          description: body.description.trim(),
          quantity: dec(body.quantity).toFixed(3),
          unit: body.unit.trim(),
          supplier: body.supplier.trim(),
          notifiedOn: civilDate(body.notifiedOn),
          note: body.note?.trim() || null,
        },
      });
      await this.audit(tx, clinicId, auth, 'create', row.id, undefined, {
        description: row.description,
        supplier: row.supplier,
        notifiedOn: body.notifiedOn,
      });
      return toDto(row, today, deadlineDays);
    });
  }

  /** E-36: the supplier exchanged the product. Allowed at any time while the record is awaiting. */
  async exchange(clinicId: string, id: string, auth: AuthContext, body: ExchangeIncorrectReceiptDto): Promise<IncorrectReceiptDto> {
    const today = civilToIso(civilToday());
    const exchangedOn = body.exchangedOn ?? today;
    if (!isValidCivilDate(exchangedOn)) throw invalid({ exchangedOn: ['Data inválida.'] });
    if (exchangedOn > today) throw invalid({ exchangedOn: ['A data da troca não pode ser futura.'] });
    const deadlineDays = await this.deadlineDays();

    return this.prisma.$transaction(async (tx) => {
      const current = await this.findOwned(tx, clinicId, id);
      this.assertOpen(current);
      if (exchangedOn < (dateColumnToCivil(current.notifiedOn) as string)) {
        throw invalid({ exchangedOn: ['A troca não pode ser anterior à data da notificação.'] });
      }
      const resolved = await this.resolve(tx, clinicId, id, 'EXCHANGED', exchangedOn, body.note);
      await this.audit(tx, clinicId, auth, 'update', id, { status: current.status }, { status: 'EXCHANGED', resolvedOn: exchangedOn });
      return toDto(resolved, today, deadlineDays);
    });
  }

  /** E-38: after the deadline, the product is thrown away. It never entered the stock, so the balance does not change. */
  async discard(clinicId: string, id: string, auth: AuthContext, body: DiscardIncorrectReceiptDto): Promise<IncorrectReceiptDto> {
    const justification = body.justification?.trim();
    if (!justification) {
      throw new UnprocessableEntityException({
        code: 'STOCK_JUSTIFICATION_REQUIRED',
        detail: 'Informe a justificativa do descarte.',
      });
    }
    const today = civilToIso(civilToday());
    const deadlineDays = await this.deadlineDays();

    return this.prisma.$transaction(async (tx) => {
      const current = await this.findOwned(tx, clinicId, id);
      this.assertOpen(current);
      this.assertDeadlineReached(current, today, deadlineDays);
      const resolved = await this.resolve(tx, clinicId, id, 'DISCARDED', today, justification);
      await this.audit(tx, clinicId, auth, 'update', id, { status: current.status }, { status: 'DISCARDED', resolvedOn: today, justification });
      return toDto(resolved, today, deadlineDays);
    });
  }

  /**
   * E-37: after the deadline, the product becomes stock. One transaction closes the record, adds the quantity to the
   * lot (creating it when it does not exist), writes an ENTRY movement with origin "abandoned-product" and the event.
   * No receipt note is issued. The record has no item, so the caller says which item receives it.
   */
  async incorporate(
    clinicId: string,
    id: string,
    auth: AuthContext,
    idempotencyHeader: string,
    body: IncorporateIncorrectReceiptDto,
  ): Promise<IncorporationDto> {
    const today = civilToIso(civilToday());
    if (body.expiresOn !== undefined && !isValidCivilDate(body.expiresOn)) throw invalid({ expiresOn: ['Data inválida.'] });
    const deadlineDays = await this.deadlineDays();
    // Same scope as the stored responses: per user. It is also what the ledger stores.
    const ledgerKey = storageKey(auth.userId, idempotencyHeader.trim());

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Locks the clinic row, so a lot is never created twice by two entries at the same time (same idea as E-27).
        await tx.$queryRaw`SELECT id FROM clinics WHERE id = ${clinicId}::uuid FOR NO KEY UPDATE`;

        const current = await this.findOwned(tx, clinicId, id);
        this.assertOpen(current);
        this.assertDeadlineReached(current, today, deadlineDays);

        const item = await tx.item.findFirst({
          where: { clinicId, code: { equals: body.itemCode.trim(), mode: 'insensitive' } },
          select: { id: true, code: true, name: true, unit: true, active: true, tracksLotAndExpiry: true },
        });
        if (!item) {
          throw new NotFoundException({ code: 'STOCK_CODE_NOT_FOUND', detail: `Não há insumo com o código ${body.itemCode} nesta clínica.` });
        }
        if (!item.active) {
          throw new UnprocessableEntityException({ code: 'STOCK_ITEM_INACTIVE', detail: 'O insumo está inativo e não recebe movimentação.' });
        }
        if (item.unit.trim().toLowerCase() !== current.unit.trim().toLowerCase()) {
          throw new UnprocessableEntityException({
            code: 'STOCK_UNIT_MISMATCH',
            detail: `O produto foi registrado em "${current.unit}" e o insumo ${item.code} usa "${item.unit}".`,
            errors: { itemCode: [`A unidade do insumo (${item.unit}) é diferente da registrada (${current.unit}).`] },
          });
        }

        const tracks = item.tracksLotAndExpiry;
        const errors: FieldErrors = {};
        if (tracks && !body.lotCode?.trim()) errors.lotCode = ['Informe o lote: este insumo controla lote e validade.'];
        if (tracks && !body.expiresOn) errors.expiresOn = ['Informe a validade: este insumo controla lote e validade.'];
        if (Object.keys(errors).length > 0) {
          throw new UnprocessableEntityException({
            code: 'STOCK_LOT_REQUIRED',
            detail: 'Insumo com controle de lote exige lote e validade.',
            errors,
          });
        }
        // An item without lot control keeps its balance in the lot "-", with no expiry (same as the seed).
        const lotCode = tracks ? (body.lotCode as string).trim() : '-';
        const expiresOn = tracks ? (body.expiresOn as string) : null;

        // Closes the record first: if another request already closed it, nothing below runs.
        const resolved = await this.resolve(tx, clinicId, id, 'INCORPORATED', today, body.justification);

        const quantity = dec(current.quantity);
        const existing = await tx.lot.findFirst({ where: { clinicId, itemId: item.id, lotCode } });
        let lotId: string;
        if (existing) {
          const existingExpiry = dateColumnToCivil(existing.expiresOn);
          if (existingExpiry !== expiresOn) {
            throw new UnprocessableEntityException({
              code: 'STOCK_LOT_EXPIRY_MISMATCH',
              detail: `O lote ${lotCode} já existe com outra validade (${existingExpiry ?? 'sem validade'}).`,
              errors: { expiresOn: [`O lote ${lotCode} já existe com a validade ${existingExpiry ?? 'sem validade'}. Use outro código de lote.`] },
            });
          }
          await tx.lot.update({ where: { id: existing.id }, data: { quantity: { increment: quantity.toFixed(3) } } });
          lotId = existing.id;
        } else {
          const created = await tx.lot.create({
            data: { clinicId, itemId: item.id, lotCode, expiresOn: expiresOn ? civilDate(expiresOn) : null, quantity: quantity.toFixed(3) },
            select: { id: true },
          });
          lotId = created.id;
        }

        // Lot and expiry are copied into the movement (RNF-14).
        const movement = await tx.movement.create({
          data: {
            clinicId,
            itemId: item.id,
            lotId,
            lotCode,
            expiresOn: expiresOn ? civilDate(expiresOn) : null,
            kind: 'ENTRY',
            quantity: quantity.toFixed(3),
            reason: `Recebimento incorreto incorporado: ${current.description}`,
            userId: auth.userId,
            origin: 'abandoned-product',
            idempotencyKey: ledgerKey,
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
            incorrectReceiptId: id,
            userId: auth.userId,
            occurredAt: movement.occurredAt.toISOString(),
          },
          { clinicId, tx },
        );
        await this.audit(tx, clinicId, auth, 'update', id, { status: current.status }, {
          status: 'INCORPORATED',
          resolvedOn: today,
          itemId: item.id,
          lotId,
          movementId: movement.id,
        });

        return {
          receipt: toDto(resolved, today, deadlineDays),
          movementId: movement.id,
          itemId: item.id,
          itemCode: item.code,
          lotId,
          lotCode,
          quantity: toQuantityString(quantity),
        };
      });
    } catch (error) {
      // Same key already in the ledger: simultaneous resend, or a key reused after its 72 hours expired.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: 'Já existe uma entrada com esta Idempotency-Key. Se ela ainda está em andamento, aguarde; senão, use uma chave nova.',
        });
      }
      throw error;
    }
  }

  /** RF-04: the deadline in days. Falls back to 45 when the parameter is missing or is not a positive integer. */
  private async deadlineDays(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'incorrectReceiptDeadlineDays' } });
    const value = setting?.value;
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : DEFAULT_DEADLINE_DAYS;
  }

  private async assertClinicExists(clinicId: string): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Clínica não encontrada.' });
  }

  /** Search by id AND clinic: a record of another clinic simply "does not exist" here (RN-13). */
  private async findOwned(tx: Prisma.TransactionClient, clinicId: string, id: string): Promise<IncorrectReceipt> {
    const row = await tx.incorrectReceipt.findFirst({ where: { id, clinicId } });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Recebimento incorreto não encontrado nesta clínica.' });
    return row;
  }

  private assertOpen(row: IncorrectReceipt): void {
    if (row.status !== 'AWAITING_EXCHANGE') throw closedError();
  }

  private assertDeadlineReached(row: IncorrectReceipt, today: string, deadlineDays: number): void {
    const notifiedOn = dateColumnToCivil(row.notifiedOn) as string;
    if (!isDeadlineReached(notifiedOn, today, deadlineDays)) {
      const remaining = Math.max(0, deadlineDays - describeIncorrectReceipt({ status: row.status, notifiedOn, resolvedOn: null, today, deadlineDays }).daysSinceNotified);
      throw new ConflictException({
        code: 'STOCK_DEADLINE_NOT_REACHED',
        detail: `O prazo de ${deadlineDays} dias para a troca ainda não foi completado (faltam ${remaining} dia(s)).`,
      });
    }
  }

  /** Closes the record only if it is still awaiting. Two requests at once: one wins, the other gets 409. */
  private async resolve(
    tx: Prisma.TransactionClient,
    clinicId: string,
    id: string,
    status: 'EXCHANGED' | 'INCORPORATED' | 'DISCARDED',
    resolvedOn: string,
    justification: string | undefined,
  ): Promise<IncorrectReceipt> {
    const updated = await tx.incorrectReceipt.updateMany({
      where: { id, clinicId, status: 'AWAITING_EXCHANGE' },
      data: { status, resolvedOn: civilDate(resolvedOn), justification: justification?.trim() || null },
    });
    if (updated.count === 0) throw closedError();
    return tx.incorrectReceipt.findUniqueOrThrow({ where: { id } });
  }

  /** The record does not store who created or resolved it, so every change is written to the audit trail. */
  private audit(
    tx: Prisma.TransactionClient,
    clinicId: string,
    auth: AuthContext,
    action: 'create' | 'update',
    id: string,
    before: Prisma.InputJsonValue | undefined,
    after: Prisma.InputJsonValue,
  ) {
    return tx.auditEntry.create({
      data: { clinicId, userId: auth.userId, action, entity: 'incorrect-receipt', entityId: id, before, after },
    });
  }
}