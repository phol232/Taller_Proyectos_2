DROP FUNCTION IF EXISTS fn_create_course_offering(UUID, UUID, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS fn_update_course_offering(UUID, UUID, UUID, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS fn_get_course_offering_by_id(UUID);
DROP FUNCTION IF EXISTS fn_list_all_course_offerings();
DROP FUNCTION IF EXISTS fn_search_course_offerings(VARCHAR);
DROP FUNCTION IF EXISTS fn_cancel_course_offering(UUID);
DROP FUNCTION IF EXISTS fn_delete_course_offering(UUID);
DROP FUNCTION IF EXISTS fn_clear_course_teacher_candidates(UUID);
DROP FUNCTION IF EXISTS fn_add_course_teacher_candidate(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS fn_list_course_teacher_candidates(UUID);
DROP FUNCTION IF EXISTS fn_clear_classroom_course_offering_candidates(UUID);
DROP FUNCTION IF EXISTS fn_add_classroom_course_offering_candidate(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS fn_list_classroom_course_offering_candidates(UUID);
DROP FUNCTION IF EXISTS fn_list_course_offering_classroom_candidates(UUID);

-- ------------------------------------------------------------
-- 2) Reestructurar las tablas que apuntaban a course_offerings.
--    Estrategia: agregar course_id (poblado desde la offering),
--    luego eliminar course_offering_id y su unique relacionado.
-- ------------------------------------------------------------

-- 2.1 course_schedule_assignments
ALTER TABLE course_schedule_assignments
    ADD COLUMN IF NOT EXISTS course_id UUID;

UPDATE course_schedule_assignments csa
SET    course_id = co.course_id
FROM   course_offerings co
WHERE  csa.course_offering_id = co.id
  AND  csa.course_id IS NULL;

ALTER TABLE course_schedule_assignments
    DROP CONSTRAINT IF EXISTS uq_course_schedule_assignments;
ALTER TABLE course_schedule_assignments
    DROP CONSTRAINT IF EXISTS fk_course_schedule_assignments_offering;
DROP INDEX IF EXISTS idx_course_schedule_assignments_offering_id;
ALTER TABLE course_schedule_assignments
    DROP COLUMN IF EXISTS course_offering_id;
ALTER TABLE course_schedule_assignments
    ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE course_schedule_assignments
    ADD CONSTRAINT fk_course_schedule_assignments_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
ALTER TABLE course_schedule_assignments
    ADD CONSTRAINT uq_course_schedule_assignments
        UNIQUE (teaching_schedule_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_assignments_course_id
    ON course_schedule_assignments(course_id);

-- 2.2 course_assignment_slots
ALTER TABLE course_assignment_slots
    ADD COLUMN IF NOT EXISTS course_id UUID;

UPDATE course_assignment_slots cas
SET    course_id = co.course_id
FROM   course_offerings co
WHERE  cas.course_offering_id = co.id
  AND  cas.course_id IS NULL;

ALTER TABLE course_assignment_slots
    DROP CONSTRAINT IF EXISTS fk_course_assignment_slots_offering;
DROP INDEX IF EXISTS idx_course_assignment_slots_offering_id;
ALTER TABLE course_assignment_slots
    DROP COLUMN IF EXISTS course_offering_id;
ALTER TABLE course_assignment_slots
    ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_course_assignment_slots_course_id
    ON course_assignment_slots(course_id);

-- 2.3 student_schedule_items (course_id ya existe; eliminar offering_id)
ALTER TABLE student_schedule_items
    DROP CONSTRAINT IF EXISTS uq_student_schedule_items_offering;
ALTER TABLE student_schedule_items
    DROP CONSTRAINT IF EXISTS fk_student_schedule_items_offering;
DROP INDEX IF EXISTS idx_student_schedule_items_offering_id;
ALTER TABLE student_schedule_items
    DROP COLUMN IF EXISTS course_offering_id;
CREATE INDEX IF NOT EXISTS idx_student_schedule_items_course_id
    ON student_schedule_items(course_id);

-- 2.4 solver_run_conflicts
ALTER TABLE solver_run_conflicts
    ADD COLUMN IF NOT EXISTS course_id UUID;

UPDATE solver_run_conflicts src
SET    course_id = co.course_id
FROM   course_offerings co
WHERE  src.course_offering_id = co.id
  AND  src.course_id IS NULL;

ALTER TABLE solver_run_conflicts
    DROP CONSTRAINT IF EXISTS fk_solver_run_conflicts_offering;
ALTER TABLE solver_run_conflicts
    DROP COLUMN IF EXISTS course_offering_id;
ALTER TABLE solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- 2.5 schedule_feedback_events
ALTER TABLE schedule_feedback_events
    ADD COLUMN IF NOT EXISTS course_id UUID;

UPDATE schedule_feedback_events sfe
SET    course_id = co.course_id
FROM   course_offerings co
WHERE  sfe.course_offering_id = co.id
  AND  sfe.course_id IS NULL;

ALTER TABLE schedule_feedback_events
    DROP CONSTRAINT IF EXISTS fk_schedule_feedback_events_offering;
ALTER TABLE schedule_feedback_events
    DROP COLUMN IF EXISTS course_offering_id;
ALTER TABLE schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 3) Eliminar tablas satélite y course_offerings.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_course_offering_classroom_candidates_updated_at
    ON course_offering_classroom_candidates;
DROP TRIGGER IF EXISTS trg_course_teacher_candidates_updated_at
    ON course_teacher_candidates;
DROP TRIGGER IF EXISTS trg_course_offerings_updated_at
    ON course_offerings;

DROP TABLE IF EXISTS course_offering_classroom_candidates;
DROP TABLE IF EXISTS course_teacher_candidates;
DROP TABLE IF EXISTS course_offerings;

-- ------------------------------------------------------------
-- 4) Crear classroom_courses (N:M classroom <-> course).
--    Espejo de teacher_courses; sin priority_weight.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classroom_courses (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID        NOT NULL,
    course_id    UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_classroom_courses_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_classroom_courses_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_classroom_courses UNIQUE (classroom_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_courses_classroom_id
    ON classroom_courses(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_courses_course_id
    ON classroom_courses(course_id);

DROP TRIGGER IF EXISTS trg_classroom_courses_updated_at ON classroom_courses;
CREATE TRIGGER trg_classroom_courses_updated_at
    BEFORE UPDATE ON classroom_courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE course_schedule_assignments
    DROP CONSTRAINT uq_course_schedule_assignments;

-- ============================================================
-- IMPORTANTE: después de aplicar esta migración, recargar las
-- funciones PL/pgSQL del módulo classrooms para que la API pueda
-- gestionar la nueva tabla intermedia:
--
--   psql ... -f database/functions/classrooms/functions.sql
--   psql ... -f database/functions/courses/functions.sql
--
-- Estas redefinen fn_delete_classroom, fn_delete_course y agregan
-- fn_add/remove/set_classroom_courses[_by_codes],
-- fn_list_classroom_course_codes, fn_list_classroom_courses,
-- fn_list_course_classroom_ids.
-- ============================================================
