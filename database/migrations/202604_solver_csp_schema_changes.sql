
BEGIN;

ALTER TABLE course_schedule_assignments
    DROP CONSTRAINT IF EXISTS uq_course_schedule_assignments;

-- Helpful supporting index (no longer unique).
CREATE INDEX IF NOT EXISTS idx_csa_schedule_course
    ON course_schedule_assignments(teaching_schedule_id, course_id);

CREATE TABLE IF NOT EXISTS course_corequisites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    corequisite_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_corequisites UNIQUE (course_id, corequisite_id),
    CONSTRAINT chk_course_corequisites_self CHECK (course_id <> corequisite_id)
);

CREATE INDEX IF NOT EXISTS idx_course_corequisites_course
    ON course_corequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_corequisites_coreq
    ON course_corequisites(corequisite_id);

-- ------------------------------------------------------------
-- 3. Preferred shift on profiles
-- ------------------------------------------------------------
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS preferred_shift VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'profiles' AND constraint_name = 'chk_profiles_preferred_shift'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT chk_profiles_preferred_shift
            CHECK (preferred_shift IS NULL OR preferred_shift IN
                   ('MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE'));
    END IF;
END $$;

-- ------------------------------------------------------------
-- 4. GPA on students
-- ------------------------------------------------------------
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS gpa NUMERIC(4,2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'students' AND constraint_name = 'chk_students_gpa_range'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT chk_students_gpa_range
            CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 20));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_gpa
    ON students(gpa DESC NULLS LAST)
    WHERE is_active = TRUE;

-- ------------------------------------------------------------
-- 5. Building info + travel times
-- ------------------------------------------------------------
ALTER TABLE classrooms
    ADD COLUMN IF NOT EXISTS building_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_classrooms_building_code
    ON classrooms(building_code);

CREATE TABLE IF NOT EXISTS building_travel_times (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_a  VARCHAR(20) NOT NULL,
    building_b  VARCHAR(20) NOT NULL,
    minutes     INTEGER     NOT NULL CHECK (minutes >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_building_travel UNIQUE (building_a, building_b),
    CONSTRAINT chk_building_travel_distinct CHECK (building_a <> building_b)
);

CREATE INDEX IF NOT EXISTS idx_building_travel_a
    ON building_travel_times(building_a);
CREATE INDEX IF NOT EXISTS idx_building_travel_b
    ON building_travel_times(building_b);

-- ------------------------------------------------------------
-- 6. Capacity counters on course_schedule_assignments
-- ------------------------------------------------------------
ALTER TABLE course_schedule_assignments
    ADD COLUMN IF NOT EXISTS enrolled_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_capacity   INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'course_schedule_assignments'
          AND constraint_name = 'chk_csa_enrolled_count_nonneg'
    ) THEN
        ALTER TABLE course_schedule_assignments
            ADD CONSTRAINT chk_csa_enrolled_count_nonneg CHECK (enrolled_count >= 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'course_schedule_assignments'
          AND constraint_name = 'chk_csa_max_capacity_nonneg'
    ) THEN
        ALTER TABLE course_schedule_assignments
            ADD CONSTRAINT chk_csa_max_capacity_nonneg CHECK (max_capacity >= 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'course_schedule_assignments'
          AND constraint_name = 'chk_csa_enrolled_le_max'
    ) THEN
        ALTER TABLE course_schedule_assignments
            ADD CONSTRAINT chk_csa_enrolled_le_max CHECK (enrolled_count <= max_capacity);
    END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Optional helper: link student_schedule_items to a specific
--    course_schedule_assignment (offer). Required by Phase 2 to
--    track vacancies per offer accurately.
-- ------------------------------------------------------------
ALTER TABLE student_schedule_items
    ADD COLUMN IF NOT EXISTS course_assignment_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'student_schedule_items'
          AND constraint_name = 'fk_student_schedule_items_assignment'
    ) THEN
        ALTER TABLE student_schedule_items
            ADD CONSTRAINT fk_student_schedule_items_assignment
            FOREIGN KEY (course_assignment_id)
            REFERENCES course_schedule_assignments(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ssi_course_assignment
    ON student_schedule_items(course_assignment_id);

COMMIT;
