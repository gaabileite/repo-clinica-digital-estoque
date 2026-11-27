import type { ReportItem, ReportMovement } from './preview-data';

const gloves: ReportItem = { code: 'INS-0001', name: 'Luvas de procedimento', category: 'EPI', unit: 'caixa' };
const gauze: ReportItem = { code: 'INS-0002', name: 'Gaze estéril', category: 'Curativos', unit: 'pacote' };
const bandage: ReportItem = { code: 'INS-0003', name: 'Atadura', category: 'Curativos', unit: 'pacote' };
const compress: ReportItem = { code: 'INS-0004', name: 'Compressa', category: 'Curativos', unit: 'pacote' };
const odontologia = 'Clínica de Odontologia';
const fisioterapia = 'Clínica de Fisioterapia';

const records: Array<{
  daysAgo: number;
  clinic: string;
  item: ReportItem;
  kind: ReportMovement['kind'];
  quantity: number;
  lot?: string;
}> = [
  { daysAgo: 1, clinic: odontologia, item: gloves, kind: 'consumption', quantity: 14 },
  { daysAgo: 3, clinic: odontologia, item: gauze, kind: 'consumption', quantity: 80 },
  { daysAgo: 2, clinic: odontologia, item: gauze, kind: 'return', quantity: 10 },
  { daysAgo: 4, clinic: odontologia, item: bandage, kind: 'consumption', quantity: 20 },
  { daysAgo: 5, clinic: odontologia, item: compress, kind: 'consumption', quantity: 9 },
  { daysAgo: 11, clinic: odontologia, item: gloves, kind: 'consumption', quantity: 8 },
  { daysAgo: 6, clinic: odontologia, item: gauze, kind: 'expiry-loss', quantity: 4, lot: 'GAZ-08' },
  { daysAgo: 15, clinic: odontologia, item: bandage, kind: 'damage-discard', quantity: 3, lot: 'ATA-21' },
  { daysAgo: 55, clinic: odontologia, item: gloves, kind: 'consumption', quantity: 12 },
  { daysAgo: 2, clinic: fisioterapia, item: gauze, kind: 'consumption', quantity: 26 },
  { daysAgo: 17, clinic: fisioterapia, item: compress, kind: 'damage-discard', quantity: 2, lot: 'COM-17' },
];

const civilDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' });
const oneDay = 86_400_000;

export function createReportsDemo(): ReportMovement[] {
  const today = Date.now();
  return records.map(({ daysAgo, ...entry }, index) => ({
    ...entry,
    id: String(index + 1),
    date: civilDate.format(today - oneDay * daysAgo),
  }));
}
