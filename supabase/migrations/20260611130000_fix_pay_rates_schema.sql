-- Fix branch_pay_rates schema to work with shift_type instead of shift_template_id
-- 1. Add shift_type column to branch_pay_rates
ALTER TABLE "public"."branch_pay_rates" ADD COLUMN IF NOT EXISTS "shift_type" text NOT NULL DEFAULT 'MORNING' CHECK ("shift_type" IN ('MORNING', 'AFTERNOON', 'FULL_DAY'));

-- 2. Drop foreign key constraint on shift_template_id if it still exists
ALTER TABLE "public"."branch_pay_rates" DROP CONSTRAINT IF EXISTS "branch_pay_rates_shift_template_id_fkey";

-- 3. Drop shift_template_id column if it exists
ALTER TABLE "public"."branch_pay_rates" DROP COLUMN IF EXISTS "shift_template_id";

-- 4. Add composite unique constraint: branch_id, shift_type, effective_from
ALTER TABLE "public"."branch_pay_rates" 
ADD CONSTRAINT branch_pay_rates_unique_active 
UNIQUE (branch_id, shift_type, effective_from);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branch_pay_rates_lookup 
ON "public"."branch_pay_rates"(branch_id, shift_type, effective_from DESC, effective_to DESC);
