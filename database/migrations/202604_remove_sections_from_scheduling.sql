BEGIN;

DO $$
BEGIN
    IF EXISTS (
        WITH used_sections AS (
            SELECT section_id FROM section_teacher_candidates
            UNION
            SELECT section_id FROM section_assignments
            UNION
            SELECT section_id FROM student_schedule_items
            UNION
            SELECT section_id FROM solver_run_conflicts WHERE section_id IS NOT NULL
            UNION
            SELECT section_id FROM schedule_feedback_events WHERE section_id IS NOT NULL
        )
        SELECT 1
        FROM used_sections us
        JOIN course_sections cs ON cs.id = us.section_id
        GROUP BY cs.course_offering_id
        HAVING COUNT(DISTINCT cs.id) > 1
    ) THEN
        RAISE EXCEPTION 'No se puede migrar: existe al menos una oferta con mas de una seccion usada.';
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS course_teacher_candidates (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID         NOT NULL,
    teacher_id         UUID         NOT NULL,
    priority_weight    NUMERIC(8,4) NOT NULL DEFAULT 1.0 CHECK (priority_weight >= 0),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_teacher_candidates_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_teacher_candidates_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT uq_course_teacher_candidates UNIQUE (course_offering_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS course_offering_classroom_candidates (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID         NOT NULL,
    classroom_id       UUID         NOT NULL,
    priority_weight    NUMERIC(8,4) NOT NULL DEFAULT 1.0 CHECK (priority_weight >= 0),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_offering_classroom_candidates_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_offering_classroom_candidates_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT uq_course_offering_classroom_candidates UNIQUE (course_offering_id, classroom_id)
);

CREATE TABLE IF NOT EXISTS course_schedule_assignments (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_schedule_id UUID         NOT NULL,
    course_offering_id   UUID         NOT NULL,
    teacher_id           UUID         NOT NULL,
    assignment_status    VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_schedule_assignments_schedule
        FOREIGN KEY (teaching_schedule_id) REFERENCES teaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_schedule_assignments_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_schedule_assignments_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
    CONSTRAINT uq_course_schedule_assignments UNIQUE (teaching_schedule_id, course_offering_id),
    CONSTRAINT chk_course_schedule_assignments_status CHECK (assignment_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS course_assignment_slots (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_assignment_id  UUID        NOT NULL,
    teaching_schedule_id UUID         NOT NULL,
    course_offering_id   UUID         NOT NULL,
    teacher_id           UUID         NOT NULL,
    classroom_id         UUID         NOT NULL,
    time_slot_id         UUID         NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_assignment_slots_assignment
        FOREIGN KEY (course_assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_assignment_slots_schedule
        FOREIGN KEY (teaching_schedule_id) REFERENCES teaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_assignment_slots_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_assignment_slots_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_assignment_slots_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_assignment_slots_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT,
    CONSTRAINT uq_course_assignment_slots_assignment UNIQUE (course_assignment_id, time_slot_id),
    CONSTRAINT uq_course_assignment_slots_teacher UNIQUE (teaching_schedule_id, teacher_id, time_slot_id),
    CONSTRAINT uq_course_assignment_slots_classroom UNIQUE (teaching_schedule_id, classroom_id, time_slot_id)
);

ALTER TABLE course_schedule_assignments
    DROP CONSTRAINT IF EXISTS fk_course_schedule_assignments_classroom,
    DROP COLUMN IF EXISTS classroom_id;

INSERT INTO course_teacher_candidates(course_offering_id, teacher_id, priority_weight, created_at, updated_at)
SELECT cs.course_offering_id,
       stc.teacher_id,
       MAX(stc.priority_weight) AS priority_weight,
       MIN(stc.created_at) AS created_at,
       MAX(stc.updated_at) AS updated_at
FROM   section_teacher_candidates stc
JOIN   course_sections cs ON cs.id = stc.section_id
GROUP  BY cs.course_offering_id, stc.teacher_id
ON CONFLICT (course_offering_id, teacher_id) DO UPDATE
    SET priority_weight = GREATEST(course_teacher_candidates.priority_weight, EXCLUDED.priority_weight),
        updated_at = NOW();

INSERT INTO course_offering_classroom_candidates(course_offering_id, classroom_id, priority_weight, created_at, updated_at)
SELECT cs.course_offering_id,
       sa.classroom_id,
       1.0 AS priority_weight,
       MIN(sa.created_at) AS created_at,
       MAX(sa.updated_at) AS updated_at
FROM   section_assignments sa
JOIN   course_sections cs ON cs.id = sa.section_id
GROUP  BY cs.course_offering_id, sa.classroom_id
ON CONFLICT (course_offering_id, classroom_id) DO UPDATE
    SET updated_at = NOW();

INSERT INTO course_schedule_assignments(
    id,
    teaching_schedule_id,
    course_offering_id,
    teacher_id,
    assignment_status,
    created_at,
    updated_at
)
SELECT sa.id,
       sa.teaching_schedule_id,
       cs.course_offering_id,
       sa.teacher_id,
       sa.assignment_status,
       sa.created_at,
       sa.updated_at
FROM   section_assignments sa
JOIN   course_sections cs ON cs.id = sa.section_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_assignment_slots(
    id,
    course_assignment_id,
    teaching_schedule_id,
    course_offering_id,
    teacher_id,
    classroom_id,
    time_slot_id,
    created_at,
    updated_at
)
SELECT sas.id,
       sas.section_assignment_id,
       sas.teaching_schedule_id,
       cs.course_offering_id,
       sas.teacher_id,
       sas.classroom_id,
       sas.time_slot_id,
       sas.created_at,
       sas.updated_at
FROM   section_assignment_slots sas
JOIN   course_sections cs ON cs.id = sas.section_id
ON CONFLICT (id) DO NOTHING;

ALTER TABLE student_schedule_items
    ADD COLUMN IF NOT EXISTS course_offering_id UUID;

UPDATE student_schedule_items ssi
SET    course_offering_id = cs.course_offering_id
FROM   course_sections cs
WHERE  ssi.section_id = cs.id
  AND  ssi.course_offering_id IS NULL;

ALTER TABLE student_schedule_items
    ALTER COLUMN course_offering_id SET NOT NULL,
    DROP CONSTRAINT IF EXISTS fk_student_schedule_items_section,
    DROP CONSTRAINT IF EXISTS uq_student_schedule_items_section,
    ADD CONSTRAINT fk_student_schedule_items_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE RESTRICT,
    ADD CONSTRAINT uq_student_schedule_items_offering
        UNIQUE (student_schedule_id, course_offering_id);

ALTER TABLE student_schedule_items
    DROP COLUMN IF EXISTS section_id;

ALTER TABLE solver_run_conflicts
    ADD COLUMN IF NOT EXISTS course_offering_id UUID;

UPDATE solver_run_conflicts src
SET    course_offering_id = cs.course_offering_id
FROM   course_sections cs
WHERE  src.section_id = cs.id
  AND  src.course_offering_id IS NULL;

ALTER TABLE solver_run_conflicts
    DROP CONSTRAINT IF EXISTS fk_solver_run_conflicts_section,
    ADD CONSTRAINT fk_solver_run_conflicts_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE SET NULL;

ALTER TABLE solver_run_conflicts
    DROP COLUMN IF EXISTS section_id;

ALTER TABLE schedule_feedback_events
    ADD COLUMN IF NOT EXISTS course_offering_id UUID;

UPDATE schedule_feedback_events sfe
SET    course_offering_id = cs.course_offering_id
FROM   course_sections cs
WHERE  sfe.section_id = cs.id
  AND  sfe.course_offering_id IS NULL;

UPDATE schedule_feedback_events sfe
SET    assignment_id = csa.id
FROM   section_assignments sa
JOIN   course_schedule_assignments csa ON csa.id = sa.id
WHERE  sfe.assignment_id = sa.id;

ALTER TABLE schedule_feedback_events
    DROP CONSTRAINT IF EXISTS fk_schedule_feedback_events_section,
    DROP CONSTRAINT IF EXISTS fk_schedule_feedback_events_assignment,
    ADD CONSTRAINT fk_schedule_feedback_events_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_schedule_feedback_events_assignment
        FOREIGN KEY (assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE SET NULL;

ALTER TABLE schedule_feedback_events
    DROP COLUMN IF EXISTS section_id;

CREATE INDEX IF NOT EXISTS idx_course_teacher_candidates_offering_id ON course_teacher_candidates(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_course_teacher_candidates_teacher_id ON course_teacher_candidates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_offering_classroom_candidates_offering_id ON course_offering_classroom_candidates(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_course_offering_classroom_candidates_classroom_id ON course_offering_classroom_candidates(classroom_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_assignments_schedule_id ON course_schedule_assignments(teaching_schedule_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_assignments_offering_id ON course_schedule_assignments(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_assignments_teacher_id ON course_schedule_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_assignment_slots_schedule_id ON course_assignment_slots(teaching_schedule_id);
CREATE INDEX IF NOT EXISTS idx_course_assignment_slots_offering_id ON course_assignment_slots(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_course_assignment_slots_slot_id ON course_assignment_slots(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_student_schedule_items_offering_id ON student_schedule_items(course_offering_id);

DROP TRIGGER IF EXISTS trg_course_teacher_candidates_updated_at ON course_teacher_candidates;
CREATE TRIGGER trg_course_teacher_candidates_updated_at
    BEFORE UPDATE ON course_teacher_candidates
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_course_offering_classroom_candidates_updated_at ON course_offering_classroom_candidates;
CREATE TRIGGER trg_course_offering_classroom_candidates_updated_at
    BEFORE UPDATE ON course_offering_classroom_candidates
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_course_schedule_assignments_updated_at ON course_schedule_assignments;
CREATE TRIGGER trg_course_schedule_assignments_updated_at
    BEFORE UPDATE ON course_schedule_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_course_assignment_slots_updated_at ON course_assignment_slots;
CREATE TRIGGER trg_course_assignment_slots_updated_at
    BEFORE UPDATE ON course_assignment_slots
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_clear_course_teacher_candidates(p_offering_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM course_teacher_candidates
    WHERE course_offering_id = p_offering_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_add_course_teacher_candidate(
    p_course_offering_id UUID,
    p_teacher_id         UUID,
    p_priority_weight    NUMERIC(8,4)
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    INSERT INTO course_teacher_candidates(course_offering_id, teacher_id, priority_weight)
    VALUES (p_course_offering_id, p_teacher_id, COALESCE(p_priority_weight, 1.0))
    ON CONFLICT (course_offering_id, teacher_id) DO UPDATE
        SET priority_weight = EXCLUDED.priority_weight;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_course_teacher_candidates(p_offering_id UUID)
RETURNS TABLE(teacher_id UUID, priority_weight NUMERIC(8,4))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ctc.teacher_id, ctc.priority_weight
    FROM course_teacher_candidates ctc
    WHERE ctc.course_offering_id = p_offering_id
    ORDER BY ctc.priority_weight DESC, ctc.teacher_id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_clear_classroom_course_offering_candidates(p_classroom_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM course_offering_classroom_candidates
    WHERE classroom_id = p_classroom_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_add_classroom_course_offering_candidate(
    p_classroom_id UUID,
    p_course_offering_id UUID,
    p_priority_weight NUMERIC(8,4)
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_classroom_capacity INTEGER;
    v_expected_enrollment INTEGER;
BEGIN
    SELECT capacity INTO v_classroom_capacity
    FROM classrooms
    WHERE id = p_classroom_id;

    IF v_classroom_capacity IS NULL THEN
        RAISE EXCEPTION 'El aula indicada no existe.' USING ERRCODE = '23503';
    END IF;

    SELECT expected_enrollment INTO v_expected_enrollment
    FROM course_offerings
    WHERE id = p_course_offering_id;

    IF v_expected_enrollment IS NULL THEN
        RAISE EXCEPTION 'La oferta de curso indicada no existe.' USING ERRCODE = '23503';
    END IF;

    IF v_expected_enrollment > v_classroom_capacity THEN
        RAISE EXCEPTION 'La capacidad del aula (%) es menor que la matrícula esperada de la oferta (%).',
            v_classroom_capacity, v_expected_enrollment
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO course_offering_classroom_candidates(course_offering_id, classroom_id, priority_weight)
    VALUES (p_course_offering_id, p_classroom_id, COALESCE(p_priority_weight, 1.0))
    ON CONFLICT (course_offering_id, classroom_id) DO UPDATE
        SET priority_weight = EXCLUDED.priority_weight;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_classroom_course_offering_candidates(p_classroom_id UUID)
RETURNS TABLE(
    course_offering_id UUID,
    academic_period_id UUID,
    academic_period_code VARCHAR(50),
    academic_period_name VARCHAR(255),
    course_id UUID,
    course_code VARCHAR(50),
    course_name VARCHAR(255),
    expected_enrollment INTEGER,
    offering_status VARCHAR(20),
    priority_weight NUMERIC(8,4)
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cocc.course_offering_id,
           ap.id,
           ap.code,
           ap.name,
           c.id,
           c.code,
           c.name,
           co.expected_enrollment,
           co.status,
           cocc.priority_weight
    FROM course_offering_classroom_candidates cocc
    JOIN course_offerings co ON co.id = cocc.course_offering_id
    JOIN academic_periods ap ON ap.id = co.academic_period_id
    JOIN courses c ON c.id = co.course_id
    WHERE cocc.classroom_id = p_classroom_id
    ORDER BY ap.starts_at DESC, c.code ASC, c.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_course_offering_classroom_candidates(p_course_offering_id UUID)
RETURNS TABLE(
    classroom_id UUID,
    classroom_code VARCHAR(50),
    classroom_name VARCHAR(255),
    capacity INTEGER,
    room_type VARCHAR(100),
    is_active BOOLEAN,
    priority_weight NUMERIC(8,4)
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cl.id,
           cl.code,
           cl.name,
           cl.capacity,
           cl.room_type,
           cl.is_active,
           cocc.priority_weight
    FROM course_offering_classroom_candidates cocc
    JOIN classrooms cl ON cl.id = cocc.classroom_id
    WHERE cocc.course_offering_id = p_course_offering_id
    ORDER BY cocc.priority_weight DESC, cl.code ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_course_offering(p_offering_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
    v_student_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM course_schedule_assignments
    WHERE course_offering_id = p_offering_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % asignación(es) en horarios y no puede eliminarse. Cancélela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_items_count
    FROM student_schedule_items
    WHERE course_offering_id = p_offering_id;

    IF v_student_items_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % horario(s) de estudiante y no puede eliminarse. Cancélela en su lugar.', v_student_items_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_offering_classroom_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_teacher_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_offerings WHERE id = p_offering_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_teacher(p_teacher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM course_schedule_assignments
    WHERE teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM teacher_courses WHERE teacher_id = p_teacher_id;
    DELETE FROM course_teacher_candidates WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_availability WHERE teacher_id = p_teacher_id;
    DELETE FROM teachers WHERE id = p_teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_classroom(p_classroom_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM course_assignment_slots
    WHERE classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % franja(s) asignada(s) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_offering_classroom_candidates WHERE classroom_id = p_classroom_id;
    DELETE FROM classroom_availability WHERE classroom_id = p_classroom_id;
    DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_clear_course_offering_sections(UUID);
DROP FUNCTION IF EXISTS fn_create_course_section(UUID, VARCHAR, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS fn_add_section_teacher_candidate(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS fn_list_course_sections(UUID);
DROP FUNCTION IF EXISTS fn_list_section_teacher_candidates(UUID);

DROP INDEX IF EXISTS idx_course_sections_offering_id;
DROP INDEX IF EXISTS idx_section_teacher_candidates_section_id;
DROP INDEX IF EXISTS idx_section_teacher_candidates_teacher_id;
DROP INDEX IF EXISTS idx_section_assignments_schedule_id;
DROP INDEX IF EXISTS idx_section_assignments_teacher_id;
DROP INDEX IF EXISTS idx_section_assignments_classroom_id;
DROP INDEX IF EXISTS idx_section_assignment_slots_schedule_id;
DROP INDEX IF EXISTS idx_section_assignment_slots_section_id;
DROP INDEX IF EXISTS idx_section_assignment_slots_slot_id;
DROP INDEX IF EXISTS idx_student_schedule_items_section_id;
DROP INDEX IF EXISTS idx_course_schedule_assignments_classroom_id;

DROP TABLE IF EXISTS section_assignment_slots;
DROP TABLE IF EXISTS section_assignments;
DROP TABLE IF EXISTS section_teacher_candidates;
DROP TABLE IF EXISTS course_sections;

COMMIT;
