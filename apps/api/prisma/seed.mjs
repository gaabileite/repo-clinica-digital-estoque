// Seed de desenvolvimento: parâmetros padrão e clínicas de demonstração. Dados fictícios.
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  safetyMarginPercent: 20,
  highWithdrawalMultiplier: 3,
  consumptionDropPercent: 50,
  incorrectReceiptDeadlineDays: 45,
};

const DEMO_CLINICS = [
  'Clínica-Escola de Odontologia',
  'Clínica-Escola de Fisioterapia',
  'NPI — Núcleo da Pessoa Idosa',
];

async function main() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  for (const name of DEMO_CLINICS) {
    const existing = await prisma.clinic.findFirst({ where: { name } });
    if (!existing) await prisma.clinic.create({ data: { name } });
  }
  console.log('Seed concluído: parâmetros padrão e clínicas de demonstração.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
