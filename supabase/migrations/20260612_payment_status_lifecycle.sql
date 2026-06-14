-- Payment Status Lifecycle Migration
-- Adds support for: not_requested, requested, approved, rejected, paid

-- 1. Add requested_at timestamp column
ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "requested_at" TIMESTAMP WITH TIME ZONE;

-- 2. Add requested_remarks column for employee remarks on request
ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "requested_remarks" TEXT;

-- 3. Migrate existing 'pending' status to 'not_requested'
UPDATE "public"."payments" SET payment_status = 'not_requested' WHERE payment_status = 'pending';

-- 4. Backfill requested_at for any existing 'requested' payments
UPDATE "public"."payments" SET requested_at = created_at WHERE payment_status = 'requested' AND requested_at IS NULL;

-- 5. Add index on payment_status for filtering
CREATE INDEX IF NOT EXISTS idx_payments_status ON "public"."payments"(payment_status);

-- 6. Add index on requested_at for sorting
CREATE INDEX IF NOT EXISTS idx_payments_requested_at ON "public"."payments"(requested_at);
