-- Add available_shift_types to branches table
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS available_shift_types JSONB DEFAULT '["MORNING", "AFTERNOON", "FULL_DAY"]'::jsonb;
