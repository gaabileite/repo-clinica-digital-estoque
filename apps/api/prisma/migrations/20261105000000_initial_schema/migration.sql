-- CreateEnum
CREATE TYPE "Profile" AS ENUM ('SUPERUSER', 'ADMIN', 'WAREHOUSE', 'BUDGET_CONTROLLER');

-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('CONSUMPTION', 'EXPIRY_LOSS', 'DAMAGE_DISCARD', 'LOAN', 'DONATION', 'ENTRY', 'REVERSAL', 'INVENTORY_ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "ReceiptOrigin" AS ENUM ('CENTRAL_WAREHOUSE', 'OTHER_CLINIC', 'EXTERNAL_DONATION', 'OTHER');

-- CreateEnum
CREATE TYPE "IncorrectReceiptStatus" AS ENUM ('AWAITING_EXCHANGE', 'EXCHANGED', 'INCORPORATED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AlertKind" AS ENUM ('CRITICAL_LEVEL', 'EXPIRY', 'LOT_NOT_NEAREST', 'HIGH_WITHDRAWAL', 'CONSUMPTION_DROP', 'INCORRECT_RECEIPT_OVERDUE');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "manager" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "autoConfirmProcedureConsumption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cache" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" "Profile" NOT NULL,
    "clinicId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "tracksLotAndExpiry" BOOLEAN NOT NULL DEFAULT true,
    "expiryAlertLeadDays" INTEGER NOT NULL DEFAULT 30,
    "recordsTemperature" BOOLEAN NOT NULL DEFAULT false,
    "temperatureRange" TEXT,
    "estimatedLeadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "unitCost" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "lotCode" TEXT NOT NULL,
    "expiresOn" DATE,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "lotId" UUID,
    "lotCode" TEXT,
    "expiresOn" DATE,
    "kind" "MovementKind" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "recipient" TEXT,
    "returnedBy" TEXT,
    "userId" TEXT NOT NULL,
    "origin" TEXT,
    "reversalOfId" UUID,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "clinicId" UUID NOT NULL,
    "origin" "ReceiptOrigin" NOT NULL,
    "originClinicId" UUID,
    "description" TEXT,
    "donorLetterFileId" TEXT,
    "proofFileId" TEXT,
    "orderedOn" DATE,
    "receivedOn" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiptId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "orderedQuantity" DECIMAL(14,3),
    "receivedQuantity" DECIMAL(14,3) NOT NULL,
    "lotCode" TEXT,
    "expiresOn" DATE,
    "lotId" UUID,

    CONSTRAINT "receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incorrect_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "notifiedOn" DATE NOT NULL,
    "note" TEXT,
    "status" "IncorrectReceiptStatus" NOT NULL DEFAULT 'AWAITING_EXCHANGE',
    "resolvedOn" DATE,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incorrect_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "materialGroup" TEXT,
    "procedureId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packageId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "defaultQuantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID NOT NULL,
    "itemId" UUID,
    "kind" "AlertKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "profiles" "Profile"[],
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile" "Profile" NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinicId" UUID,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_externalId_key" ON "clinics"("externalId");

-- CreateIndex
CREATE INDEX "user_cache_clinicId_idx" ON "user_cache"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_clinicId_name_key" ON "item_categories"("clinicId", "name");

-- CreateIndex
CREATE INDEX "items_clinicId_categoryId_idx" ON "items"("clinicId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "items_clinicId_code_key" ON "items"("clinicId", "code");

-- CreateIndex
CREATE INDEX "lots_clinicId_itemId_expiresOn_idx" ON "lots"("clinicId", "itemId", "expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "movements_reversalOfId_key" ON "movements"("reversalOfId");

-- CreateIndex
CREATE INDEX "movements_clinicId_occurredAt_idx" ON "movements"("clinicId", "occurredAt");

-- CreateIndex
CREATE INDEX "movements_clinicId_itemId_occurredAt_idx" ON "movements"("clinicId", "itemId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "movements_clinicId_idempotencyKey_key" ON "movements"("clinicId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "receipts_clinicId_receivedOn_idx" ON "receipts"("clinicId", "receivedOn");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_clinicId_number_key" ON "receipts"("clinicId", "number");

-- CreateIndex
CREATE INDEX "receipt_lines_receiptId_idx" ON "receipt_lines"("receiptId");

-- CreateIndex
CREATE INDEX "incorrect_receipts_clinicId_status_idx" ON "incorrect_receipts"("clinicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "package_items_packageId_itemId_key" ON "package_items"("packageId", "itemId");

-- CreateIndex
CREATE INDEX "alerts_clinicId_clearedAt_idx" ON "alerts"("clinicId", "clearedAt");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_profile_permission_key" ON "role_permissions"("profile", "permission");

-- CreateIndex
CREATE INDEX "audit_entries_clinicId_occurredAt_idx" ON "audit_entries"("clinicId", "occurredAt");

-- CreateIndex
CREATE INDEX "idempotency_records_createdAt_idx" ON "idempotency_records"("createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_idx" ON "outbox_events"("publishedAt");

-- CreateIndex
CREATE INDEX "dead_letter_events_createdAt_idx" ON "dead_letter_events"("createdAt");

-- AddForeignKey
ALTER TABLE "user_cache" ADD CONSTRAINT "user_cache_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incorrect_receipts" ADD CONSTRAINT "incorrect_receipts_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

