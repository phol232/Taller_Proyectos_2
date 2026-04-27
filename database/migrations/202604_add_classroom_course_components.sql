-- ============================================================
--  Migración: tabla classroom_course_components
--  Permite asignar a un aula los componentes específicos
--  (GENERAL, THEORY, PRACTICE) que puede alojar por curso,
--  análogo a teacher_course_components.
-- ============================================================

CREATE TABLE IF NOT EXISTS classroom_course_components (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id        UUID        NOT NULL,
    course_component_id UUID        NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ccc_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_ccc_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE CASCADE,
    CONSTRAINT uq_classroom_course_components
        UNIQUE (classroom_id, course_component_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_course_components_classroom_id
    ON classroom_course_components(classroom_id);

CREATE INDEX IF NOT EXISTS idx_classroom_course_components_component_id
    ON classroom_course_components(course_component_id);
