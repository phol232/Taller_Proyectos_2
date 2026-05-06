-- Migración: compatibilidad aula-componente para calidad del solver
-- Fecha: 2026-05-05

-- 1. DDL idempotente para asegurar la fuente precisa de compatibilidad.
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

-- 2. Lecturas usadas por el microservicio solver.
-- Si un aula tiene componentes explícitos para un curso, esos componentes son
-- la fuente precisa para el solver. classroom_courses se mantiene para UI/listado
-- y solo actúa como compatibilidad general cuando no hay detalle por componente.
DROP FUNCTION IF EXISTS fn_solver_list_classroom_courses();

CREATE OR REPLACE FUNCTION fn_solver_list_classroom_courses()
RETURNS TABLE (
    classroom_id UUID,
    course_id    UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.classroom_id, cc.course_id
      FROM classroom_courses cc
      JOIN classrooms cl ON cl.id = cc.classroom_id
      JOIN courses c ON c.id = cc.course_id
     WHERE cl.is_active = TRUE
       AND c.is_active = TRUE
       AND NOT EXISTS (
           SELECT 1
             FROM classroom_course_components ccc
             JOIN course_components comp ON comp.id = ccc.course_component_id
            WHERE ccc.classroom_id = cc.classroom_id
              AND comp.course_id = cc.course_id
              AND comp.is_active = TRUE
       );
END;
$$;

DROP FUNCTION IF EXISTS fn_solver_list_classroom_course_components();

CREATE OR REPLACE FUNCTION fn_solver_list_classroom_course_components()
RETURNS TABLE (
    classroom_id         UUID,
    course_component_id  UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ccc.classroom_id, ccc.course_component_id
      FROM classroom_course_components ccc
      JOIN classrooms cl ON cl.id = ccc.classroom_id
      JOIN course_components comp ON comp.id = ccc.course_component_id
      JOIN courses c ON c.id = comp.course_id
     WHERE cl.is_active = TRUE
       AND comp.is_active = TRUE
       AND c.is_active = TRUE;
END;
$$;
