ALTER TABLE "movements"
  ADD COLUMN "receiptId" UUID,
  ADD COLUMN "lotMovementCount" INTEGER;

CREATE INDEX "movements_receiptId_idx" ON "movements"("receiptId");

-- E-27 já publicava os IDs da nota e do lançamento no mesmo evento transacional.
UPDATE "movements" m
SET "receiptId" = r.id
FROM "outbox_events" e
JOIN "receipts" r ON r.id::text = e.payload->>'receiptId' AND r."clinicId" = e."clinicId"
WHERE e.type = 'stock.movement.recorded' AND e.payload->>'kind' = 'entry'
  AND m.id::text = e.payload->>'movementId' AND m."clinicId" = r."clinicId"
  AND m.kind = 'ENTRY';

-- Linhas da mesma nota compartilham o corte. Um lançamento alheio com o mesmo
-- timestamp não entra na contagem, pois sua ordem histórica é ambígua.
UPDATE "movements" entry
SET "lotMovementCount" = (
  SELECT count(*) FROM "movements" prior
  WHERE prior."lotId" = entry."lotId"
    AND (prior."occurredAt" < entry."occurredAt" OR prior."receiptId" = entry."receiptId")
)
WHERE entry."receiptId" IS NOT NULL;
