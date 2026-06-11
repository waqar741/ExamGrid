-- 1. Drop foreign key constraint on shift_schedules
ALTER TABLE "public"."shift_schedules" DROP CONSTRAINT IF EXISTS "shift_schedules_shift_template_id_fkey";

-- 2. Add shift_type column to shift_schedules
ALTER TABLE "public"."shift_schedules" ADD COLUMN IF NOT EXISTS "shift_type" text NOT NULL DEFAULT 'MORNING' CHECK ("shift_type" IN ('MORNING', 'AFTERNOON', 'FULL_DAY'));

-- 3. Drop shift_template_id column
ALTER TABLE "public"."shift_schedules" DROP COLUMN IF EXISTS "shift_template_id";

-- 4. Drop shift_templates table entirely
DROP TABLE IF EXISTS "public"."shift_templates" CASCADE;
