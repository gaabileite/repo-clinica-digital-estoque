// Seed de desenvolvimento: parâmetros padrão e dados de demonstração. Tudo fictício.
// Os saldos são coerentes com o livro: saldo do lote = soma das movimentações do lote.
// Pode rodar de novo: não duplica o que já existe.
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  safetyMarginPercent: 20,
  highWithdrawalMultiplier: 3,
  consumptionDropPercent: 50,
  incorrectReceiptDeadlineDays: 45,
};

const DAY = 864e5;
const today = new Date();
today.setHours(12, 0, 0, 0);
const daysFromNow = (n) => new Date(today.getTime() + n * DAY);
const civil = (n) => {
  const d = daysFromNow(n);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/**
 * Cada insumo: categoria, unidade, controle de lote, prazos e os lotes.
 * `qty`: saldo atual do lote. `consumed`: quanto saiu do lote nos últimos 25 dias (vira consumos no livro).
 * `exp`: dias até a validade (negativo = vencido).
 */
const CLINICS = [
  {
    name: 'Clínica-Escola de Odontologia',
    items: [
      { name: 'Luva de procedimento M (cx 100)', cat: 'EPI', un: 'cx', lead: 7, lots: [{ code: 'LV-210', exp: 210, qty: 3, consumed: 17 }] },
      { name: 'Máscara cirúrgica tripla (cx 50)', cat: 'EPI', un: 'cx', lead: 7, lots: [{ code: 'MS-300', exp: 300, qty: 34, consumed: 14 }] },
      { name: 'Gaze estéril 7,5×7,5 (pct 10)', cat: 'Curativo', un: 'pct', lead: 5, lots: [{ code: 'GZ-480', exp: 480, qty: 50, consumed: 25 }] },
      { name: 'Álcool 70% (frasco 1 L)', cat: 'Antissépticos', un: 'frasco', lead: 5, lots: [{ code: 'AL-702', exp: 18, qty: 9, consumed: 12 }] },
      {
        name: 'Anestésico lidocaína 2% c/ epinefrina (cx 50)', cat: 'Medicamentos', un: 'cx', lead: 14, temp: '15 a 25 °C',
        lots: [{ code: 'AN-551', exp: -3, qty: 2, consumed: 0 }, { code: 'AN-560', exp: 12, qty: 9, consumed: 14 }],
      },
      { name: 'Sugador descartável (pct 100)', cat: 'Descartáveis', un: 'pct', lead: 7, lots: [{ code: 'SG-600', exp: 600, qty: 8, consumed: 11 }] },
      { name: 'Papel toalha interfolhado (fardo)', cat: 'Higiene', un: 'fardo', lead: 4, noLot: true, lots: [{ code: '-', exp: null, qty: 9, consumed: 18 }] },
    ],
  },
  {
    name: 'Clínica-Escola de Fisioterapia',
    items: [
      { name: 'Gel condutor (frasco 1 kg)', cat: 'Consumo', un: 'frasco', lead: 7, lots: [{ code: 'GC-400', exp: 400, qty: 12, consumed: 6 }] },
      { name: 'Eletrodo descartável (pct 50)', cat: 'Consumo', un: 'pct', lead: 10, lots: [{ code: 'ED-250', exp: 250, qty: 5, consumed: 9 }] },
      { name: 'Atadura elástica 10 cm (un)', cat: 'Curativo', un: 'un', lead: 7, noLot: true, lots: [{ code: '-', exp: null, qty: 40, consumed: 20 }] },
    ],
  },
  { name: 'NPI — Núcleo da Pessoa Idosa', items: [] },
];

async function seedClinic(def) {
  let clinic = await prisma.clinic.findFirst({ where: { name: def.name } });
  if (!clinic) clinic = await prisma.clinic.create({ data: { name: def.name } });
  if (def.items.length === 0) return { name: def.name, items: 0, skipped: false };
  if ((await prisma.item.count({ where: { clinicId: clinic.id } })) > 0) return { name: def.name, items: 0, skipped: true };

  const categories = {};
  for (const name of new Set(def.items.map((i) => i.cat))) {
    categories[name] = await prisma.itemCategory.create({ data: { clinicId: clinic.id, name } });
  }

  let seq = 0;
  for (const it of def.items) {
    seq += 1;
    const item = await prisma.item.create({
      data: {
        clinicId: clinic.id,
        code: `INS-${String(seq).padStart(4, '0')}`,
        name: it.name,
        categoryId: categories[it.cat].id,
        unit: it.un,
        tracksLotAndExpiry: !it.noLot,
        expiryAlertLeadDays: 30,
        recordsTemperature: Boolean(it.temp),
        temperatureRange: it.temp ?? null,
        estimatedLeadTimeDays: it.lead,
        unitCost: '12.50',
      },
    });

    for (const l of it.lots) {
      // O lote nasce com o que há hoje mais o que já saiu (a entrada foi há 40 dias).
      const entered = l.qty + l.consumed;
      const lot = await prisma.lot.create({
        data: {
          clinicId: clinic.id,
          itemId: item.id,
          lotCode: l.code,
          expiresOn: l.exp === null ? null : civil(l.exp),
          quantity: String(l.qty),
        },
      });
      const base = { clinicId: clinic.id, itemId: item.id, lotId: lot.id, lotCode: l.code, expiresOn: lot.expiresOn, userId: 'seed' };
      await prisma.movement.create({
        data: { ...base, kind: 'ENTRY', quantity: String(entered), reason: 'Entrada inicial (seed)', origin: 'seed', occurredAt: daysFromNow(-40) },
      });
      // Consumo espalhado em até 5 saídas nos últimos 25 dias.
      let left = l.consumed;
      for (let n = 0; left > 0 && n < 5; n += 1) {
        const take = n === 4 ? left : Math.min(left, Math.ceil(l.consumed / 5));
        await prisma.movement.create({
          data: { ...base, kind: 'CONSUMPTION', quantity: String(-take), reason: 'Atendimento (seed)', origin: 'seed', occurredAt: daysFromNow(-(24 - n * 5)) },
        });
        left -= take;
      }
    }
  }
  await prisma.clinic.update({ where: { id: clinic.id }, data: { itemSeq: seq } });
  return { name: def.name, items: seq, skipped: false };
}

async function main() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  for (const def of CLINICS) {
    const r = await seedClinic(def);
    console.log(`- ${r.name}: ${r.skipped ? 'já tinha dados, nada a fazer' : `${r.items} insumo(s)`}`);
  }
  console.log('Seed concluído: parâmetros padrão e dados de demonstração.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
