-- DropForeignKey
ALTER TABLE "user_cache" DROP CONSTRAINT "user_cache_clinicId_fkey";

-- DropIndex
DROP INDEX "outbox_events_publishedAt_idx";

-- DropIndex
DROP INDEX "user_cache_clinicId_idx";

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "itemSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "receiptSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clinicId" UUID,
ADD COLUMN     "deadAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_cache" DROP COLUMN "clinicId";

-- CreateIndex
CREATE INDEX "movements_lotId_idx" ON "movements"("lotId");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_deadAt_nextAttemptAt_idx" ON "outbox_events"("publishedAt", "deadAt", "nextAttemptAt");


-- Regras que o Prisma não expressa no schema: o banco recusa dados inválidos mesmo se a aplicação errar.
-- Saldo de lote nunca fica negativo (RN-04, RN-05).
ALTER TABLE "lots" ADD CONSTRAINT "lots_quantity_non_negative" CHECK ("quantity" >= 0);

-- Movimentação sem quantidade não faz sentido no livro (RF-14).
ALTER TABLE "movements" ADD CONSTRAINT "movements_quantity_not_zero" CHECK ("quantity" <> 0);

-- Insumo: custo e prazos não negativos (RF-05, RF-08, RF-43).
ALTER TABLE "items" ADD CONSTRAINT "items_unit_cost_non_negative" CHECK ("unitCost" IS NULL OR "unitCost" >= 0);
ALTER TABLE "items" ADD CONSTRAINT "items_lead_days_non_negative" CHECK ("expiryAlertLeadDays" >= 0 AND "estimatedLeadTimeDays" >= 0);

-- Um único alerta aberto por clínica, insumo e tipo (evita alerta repetido, RF-26 a RF-28).
CREATE UNIQUE INDEX "alerts_open_unique" ON "alerts" ("clinicId", "itemId", "kind") WHERE "clearedAt" IS NULL AND "itemId" IS NOT NULL;
