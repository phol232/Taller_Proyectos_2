-- Migracion: reglas explicitas de cursos electivos para el solver
-- Fecha: 2026-05-05

CREATE TABLE IF NOT EXISTS solver_course_rules (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           UUID         NOT NULL,
    scheduling_kind     VARCHAR(30)  NOT NULL DEFAULT 'REGULAR',
    elective_group_code VARCHAR(50),
    max_sections        INTEGER      NOT NULL DEFAULT 3 CHECK (max_sections BETWEEN 1 AND 10),
    priority            INTEGER      NOT NULL DEFAULT 0 CHECK (priority >= 0),
    placement_strategy  VARCHAR(30)  NOT NULL DEFAULT 'NORMAL',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_solver_course_rules_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_solver_course_rules_course UNIQUE (course_id),
    CONSTRAINT chk_solver_course_rules_kind
        CHECK (scheduling_kind IN ('REGULAR', 'ELECTIVE')),
    CONSTRAINT chk_solver_course_rules_strategy
        CHECK (placement_strategy IN ('NORMAL', 'FILL_REMAINING'))
);

CREATE INDEX IF NOT EXISTS idx_solver_course_rules_course_id
    ON solver_course_rules(course_id);

CREATE INDEX IF NOT EXISTS idx_solver_course_rules_active
    ON solver_course_rules(is_active) WHERE is_active = TRUE;

DROP FUNCTION IF EXISTS fn_solver_list_course_rules();

CREATE OR REPLACE FUNCTION fn_solver_list_course_rules()
RETURNS TABLE (
    course_id           UUID,
    scheduling_kind     VARCHAR,
    elective_group_code VARCHAR,
    max_sections        INTEGER,
    priority            INTEGER,
    placement_strategy  VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT scr.course_id,
           scr.scheduling_kind,
           scr.elective_group_code,
           scr.max_sections,
           scr.priority,
           scr.placement_strategy
      FROM solver_course_rules scr
      JOIN courses c ON c.id = scr.course_id
     WHERE scr.is_active = TRUE
       AND c.is_active = TRUE;
END;
$$;

WITH elective_seed(code, elective_group_code) AS (
    VALUES
        ('ASUC00304', 'ELECT ESP1'),
        ('ASUC00587', 'ELECT ESP1'),
        ('ASUC00769', 'ELECT ESP1'),
        ('ASUC00802', 'ELECT ESP1'),
        ('ASUC01702', 'ELECT ESP1'),
        ('ASUC00210', 'ELECT ESP2'),
        ('ASUC00381', 'ELECT ESP2'),
        ('ASUC00614', 'ELECT ESP2'),
        ('ASUC00662', 'ELECT ESP2'),
        ('ASUC00756', 'ELECT ESP2'),
        ('ASUC00940', 'ELECT ESP2'),
        ('ASUC01353', 'ELEC GENER'),
        ('ASUC01511', 'ELEC GENER'),
        ('ASUC01635', 'ELEC GENER'),
        ('ASUC01658', 'ELEC GENER'),
        ('ASUC01703', 'ELEC GENER')
)
INSERT INTO solver_course_rules (
    course_id,
    scheduling_kind,
    elective_group_code,
    max_sections,
    priority,
    placement_strategy
)
SELECT c.id,
       'ELECTIVE',
       e.elective_group_code,
       1,
       100,
       'FILL_REMAINING'
  FROM elective_seed e
  JOIN courses c ON c.code = e.code
ON CONFLICT (course_id) DO UPDATE
   SET scheduling_kind = EXCLUDED.scheduling_kind,
       elective_group_code = EXCLUDED.elective_group_code,
       max_sections = EXCLUDED.max_sections,
       priority = EXCLUDED.priority,
       placement_strategy = EXCLUDED.placement_strategy,
       is_active = TRUE,
       updated_at = NOW();
