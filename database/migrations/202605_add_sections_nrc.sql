-- ============================================================
--  Migración: Secciones con NRC
--  Cada curso puede tener hasta 3 secciones por teaching_schedule.
--  Cada sección recibe un NRC de 5 dígitos único globalmente.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Tabla course_sections
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_sections (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_schedule_id  UUID         NOT NULL,
    course_id             UUID         NOT NULL,
    nrc                   CHAR(5)      NOT NULL,
    section_number        SMALLINT     NOT NULL,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_sections_schedule
        FOREIGN KEY (teaching_schedule_id)
        REFERENCES teaching_schedules(id) ON DELETE CASCADE,

    CONSTRAINT fk_course_sections_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id) ON DELETE RESTRICT,

    -- NRC único en toda la BD (nunca se reutiliza aunque el schedule se cancele)
    CONSTRAINT uq_course_sections_nrc
        UNIQUE (nrc),

    -- Máximo 3 secciones por curso por horario docente
    CONSTRAINT uq_course_sections_per_schedule
        UNIQUE (teaching_schedule_id, course_id, section_number),

    CONSTRAINT chk_course_sections_number
        CHECK (section_number BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_course_sections_schedule_id
    ON course_sections(teaching_schedule_id);

CREATE INDEX IF NOT EXISTS idx_course_sections_course_id
    ON course_sections(course_id);

CREATE INDEX IF NOT EXISTS idx_course_sections_nrc
    ON course_sections(nrc);

-- ------------------------------------------------------------
-- 2. FK section_id en course_schedule_assignments
-- ------------------------------------------------------------
ALTER TABLE course_schedule_assignments
    ADD COLUMN IF NOT EXISTS section_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'course_schedule_assignments'
          AND constraint_name = 'fk_csa_section'
    ) THEN
        ALTER TABLE course_schedule_assignments
            ADD CONSTRAINT fk_csa_section
            FOREIGN KEY (section_id)
            REFERENCES course_sections(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_csa_section_id
    ON course_schedule_assignments(section_id);

-- ------------------------------------------------------------
-- 3. Función fn_generate_unique_nrc
--    Genera un NRC de 5 dígitos único en course_sections.
--    Reintenta hasta 100 veces antes de lanzar excepción.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_unique_nrc()
RETURNS CHAR(5)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_candidate CHAR(5);
    v_attempts  INTEGER := 0;
BEGIN
    LOOP
        v_candidate := LPAD((FLOOR(RANDOM() * 100000))::BIGINT::TEXT, 5, '0');

        -- Verificar que el NRC no exista ya en ninguna sección (activa o no)
        IF NOT EXISTS (
            SELECT 1 FROM course_sections WHERE nrc = v_candidate
        ) THEN
            RETURN v_candidate;
        END IF;

        v_attempts := v_attempts + 1;
        IF v_attempts >= 100 THEN
            RAISE EXCEPTION
                'fn_generate_unique_nrc: no se pudo generar un NRC único tras 100 intentos. '
                'Considere ampliar el rango de NRC.'
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;
END;
$$;

COMMIT;
