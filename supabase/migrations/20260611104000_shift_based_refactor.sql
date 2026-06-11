-- 1. Rename the events table to shift_schedules
ALTER TABLE events RENAME TO shift_schedules;

-- 2. Rename event_date to shift_date
ALTER TABLE shift_schedules RENAME COLUMN event_date TO shift_date;

-- Rename primary key and indexes
ALTER INDEX IF EXISTS events_pkey RENAME TO shift_schedules_pkey;
ALTER INDEX IF EXISTS idx_events_date RENAME TO idx_shift_schedules_date;
ALTER INDEX IF EXISTS idx_events_branch RENAME TO idx_shift_schedules_branch;

-- 3. Add shift_template_id to shift_schedules
ALTER TABLE shift_schedules ADD COLUMN shift_template_id UUID REFERENCES shift_templates(id);

-- 4. Data Migration
DO $$
DECLARE
    assignment_rec RECORD;
    schedule_rec RECORD;
    new_schedule_id UUID;
    default_shift_id UUID;
BEGIN
    -- Get a default shift template in case an event has no assignments
    SELECT id INTO default_shift_id FROM shift_templates WHERE is_active = true LIMIT 1;

    -- Loop through all assignments to migrate their shift_template_id up to the shift_schedule
    FOR assignment_rec IN SELECT * FROM assignments LOOP
        SELECT * INTO schedule_rec FROM shift_schedules WHERE id = assignment_rec.event_id;

        IF schedule_rec.shift_template_id IS NULL THEN
            -- First assignment for this schedule, set the template ID
            UPDATE shift_schedules
            SET shift_template_id = assignment_rec.shift_template_id
            WHERE id = schedule_rec.id;
        ELSIF schedule_rec.shift_template_id != assignment_rec.shift_template_id THEN
            -- This schedule was already assigned a different shift template.
            -- We need to duplicate the schedule for this new shift template.
            
            -- Check if a schedule for this branch + date + shift_template already exists
            SELECT id INTO new_schedule_id 
            FROM shift_schedules 
            WHERE branch_id = schedule_rec.branch_id 
              AND shift_date = schedule_rec.shift_date 
              AND shift_template_id = assignment_rec.shift_template_id
            LIMIT 1;
            
            IF new_schedule_id IS NULL THEN
                -- Insert a new one
                INSERT INTO shift_schedules (
                    branch_id, shift_date, required_staff_count, notes, is_active, created_by, shift_template_id
                ) VALUES (
                    schedule_rec.branch_id, schedule_rec.shift_date, schedule_rec.required_staff_count, 
                    schedule_rec.notes, schedule_rec.is_active, schedule_rec.created_by, assignment_rec.shift_template_id
                ) RETURNING id INTO new_schedule_id;
            END IF;
            
            -- Update the assignment to point to this new or existing schedule
            UPDATE assignments 
            SET event_id = new_schedule_id 
            WHERE id = assignment_rec.id;
        END IF;
    END LOOP;

    -- For any shift_schedules without assignments (thus still having NULL shift_template_id)
    UPDATE shift_schedules
    SET shift_template_id = default_shift_id
    WHERE shift_template_id IS NULL;
END $$;

-- 5. Alter column to be NOT NULL
ALTER TABLE shift_schedules ALTER COLUMN shift_template_id SET NOT NULL;

-- 6. Rename event_id in assignments to shift_schedule_id
ALTER TABLE assignments RENAME COLUMN event_id TO shift_schedule_id;
ALTER INDEX IF EXISTS idx_assignments_event RENAME TO idx_assignments_shift_schedule;

-- 7. Rename foreign key constraint safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assignments_event_id_fkey') THEN
        ALTER TABLE assignments RENAME CONSTRAINT assignments_event_id_fkey TO assignments_shift_schedule_id_fkey;
    END IF;
END $$;

-- 8. Drop shift_template_id from assignments
DROP INDEX IF EXISTS idx_assignments_shift;
ALTER TABLE assignments DROP COLUMN shift_template_id;
