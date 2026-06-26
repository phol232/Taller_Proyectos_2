-- ============================================================
-- 202606_seat_holds.sql  (Fase 1 — esquema)
-- Bloqueo temporal de cupo (hold de 2 min) para horarios del
-- estudiante en borrador + soporte de varias opciones por período.
--
-- Cupo disponible de una asignación =
--   max_capacity - enrolled_count - holds ACTIVE no vencidos de OTROS alumnos.
-- Los holds NO tocan enrolled_count (eso solo ocurre al confirmar).
-- ============================================================

-- 1. Tabla de holds temporales de cupo --------------------------------------
CREATE TABLE IF NOT EXISTS seat_holds (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_assignment_id UUID         NOT NULL,
    student_id           UUID         NOT NULL,
    student_schedule_id  UUID         NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    expires_at           TIMESTAMPTZ  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_seat_holds_assignment
        FOREIGN KEY (course_assignment_id)
        REFERENCES course_schedule_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_schedule
        FOREIGN KEY (student_schedule_id)
        REFERENCES student_schedules(id) ON DELETE CASCADE,
    CONSTRAINT chk_seat_holds_status
        CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED'))
);

-- Cupo disponible por asignación: contar holds activos no vencidos.
CREATE INDEX IF NOT EXISTS idx_seat_holds_assignment_active
    ON seat_holds (course_assignment_id)
    WHERE status = 'ACTIVE';

-- Expiración (job de limpieza Fase 6).
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires
    ON seat_holds (expires_at)
    WHERE status = 'ACTIVE';

-- Liberar/confirmar todos los holds de un borrador.
CREATE INDEX IF NOT EXISTS idx_seat_holds_schedule
    ON seat_holds (student_schedule_id);

-- Evita doble hold del mismo alumno sobre la misma asignación dentro del
-- mismo borrador.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_holds_active_per_assignment
    ON seat_holds (student_schedule_id, course_assignment_id)
    WHERE status = 'ACTIVE';

-- 2. Permitir varios DRAFT por período, único CONFIRMED ----------------------
-- Antes: uq_student_schedules_active_per_period dejaba 1 solo horario activo
-- (DRAFT o CONFIRMED). Ahora pueden coexistir varias opciones DRAFT y solo
-- puede existir un CONFIRMED.
DROP INDEX IF EXISTS uq_student_schedules_active_per_period;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_schedules_confirmed_per_period
    ON student_schedules (student_id, academic_period_id)
    WHERE status = 'CONFIRMED';

-- 3. Orden de las opciones generadas ----------------------------------------
ALTER TABLE student_schedules
    ADD COLUMN IF NOT EXISTS option_index SMALLINT NOT NULL DEFAULT 0;
