-- ============================================================
--  Planner UC — Database Schema (Clean)
--  HU-01: Gestión de Autenticación y Sesiones
--  Base: PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  TIPOS
-- ============================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'TEACHER', 'STUDENT');
CREATE TYPE sex_type AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE day_of_week AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- ============================================================
--  TABLAS DE AUTENTICACIÓN
-- ============================================================

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE oauth2_linked_accounts (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    provider          VARCHAR(50)  NOT NULL,
    provider_subject  VARCHAR(255) NOT NULL,
    provider_email    VARCHAR(255),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_oauth2_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_oauth2_provider_subject
        UNIQUE (provider, provider_subject)
);

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMPTZ,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_refresh_token_hash
        UNIQUE (token_hash)
);

CREATE TABLE password_reset_tokens (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    otp_hash          VARCHAR(255) NOT NULL,
    reset_token_hash  VARCHAR(64),
    expires_at        TIMESTAMPTZ NOT NULL,
    verified          BOOLEAN     NOT NULL DEFAULT FALSE,
    verified_at       TIMESTAMPTZ,
    used              BOOLEAN     NOT NULL DEFAULT FALSE,
    used_at           TIMESTAMPTZ,
    verify_attempts   INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prt_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  CATÁLOGO: FACULTADES Y CARRERAS
-- ============================================================

CREATE TABLE facultades (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_facultades_code UNIQUE (code)
);

CREATE TABLE carreras (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    facultad_id  UUID           NOT NULL,
    code         VARCHAR(20),
    name         VARCHAR(255)   NOT NULL,
    is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_carreras_facultad
        FOREIGN KEY (facultad_id) REFERENCES facultades(id) ON DELETE CASCADE,
    CONSTRAINT uq_carreras_code UNIQUE (code)
);

-- ============================================================
--  PERFILES DE USUARIO
-- ============================================================

CREATE TABLE profiles (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    dni             VARCHAR(20),
    phone           VARCHAR(20),
    sex             sex_type,
    age             SMALLINT        CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
    facultad_id     UUID            NULL,
    carrera_id      UUID            NULL,
    preferred_shift VARCHAR(20),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_profiles_facultad
        FOREIGN KEY (facultad_id) REFERENCES facultades(id) ON DELETE SET NULL,
    CONSTRAINT fk_profiles_carrera
        FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE SET NULL,
    CONSTRAINT uq_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_profiles_dni     UNIQUE (dni),
    CONSTRAINT uq_profiles_phone   UNIQUE (phone),
    CONSTRAINT chk_profiles_preferred_shift
        CHECK (preferred_shift IS NULL OR preferred_shift IN
               ('MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE'))
);

-- ============================================================
--  DOMINIO ACADÉMICO Y SCHEDULING
-- ============================================================

CREATE TABLE academic_periods (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    starts_at           DATE         NOT NULL,
    ends_at             DATE         NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PLANNING',
    max_student_credits INTEGER      NOT NULL DEFAULT 22 CHECK (max_student_credits > 0),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_academic_periods_code UNIQUE (code),
    CONSTRAINT chk_academic_periods_dates CHECK (ends_at >= starts_at),
    CONSTRAINT chk_academic_periods_status CHECK (status IN ('PLANNING', 'ACTIVE', 'CLOSED'))
);

CREATE TABLE time_slots (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week day_of_week  NOT NULL,
    start_time  TIME         NOT NULL,
    end_time    TIME         NOT NULL,
    slot_order  INTEGER      NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_time_slots_value UNIQUE (day_of_week, start_time, end_time),
    CONSTRAINT chk_time_slots_range CHECK (end_time > start_time)
);

CREATE TABLE teachers (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    code        VARCHAR(50)  NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    specialty   VARCHAR(255) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teachers_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_teachers_code UNIQUE (code),
    CONSTRAINT uq_teachers_user_id UNIQUE (user_id)
);

CREATE TABLE classrooms (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(50)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    capacity      INTEGER      NOT NULL CHECK (capacity > 0),
    room_type     VARCHAR(100) NOT NULL,
    building_code VARCHAR(20),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_classrooms_code UNIQUE (code)
);

CREATE INDEX idx_classrooms_building_code ON classrooms(building_code);

CREATE TABLE building_travel_times (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    building_a  VARCHAR(20)  NOT NULL,
    building_b  VARCHAR(20)  NOT NULL,
    minutes     INTEGER      NOT NULL CHECK (minutes >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_building_travel UNIQUE (building_a, building_b),
    CONSTRAINT chk_building_travel_distinct CHECK (building_a <> building_b)
);

CREATE INDEX idx_building_travel_a ON building_travel_times(building_a);
CREATE INDEX idx_building_travel_b ON building_travel_times(building_b);

CREATE TABLE courses (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50)  NOT NULL,
    name                VARCHAR(255) NOT NULL,
    cycle               INTEGER      NOT NULL DEFAULT 1 CHECK (cycle BETWEEN 1 AND 10),
    credits             INTEGER      NOT NULL CHECK (credits BETWEEN 1 AND 6),
    required_credits    INTEGER      NOT NULL DEFAULT 0 CHECK (required_credits >= 0),
    weekly_hours        INTEGER      NOT NULL CHECK (weekly_hours >= 1),
    required_room_type  VARCHAR(100) NOT NULL CHECK (BTRIM(required_room_type) <> ''),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_courses_code UNIQUE (code)
);

CREATE TABLE course_components (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           UUID         NOT NULL,
    component_type      VARCHAR(20)  NOT NULL,
    weekly_hours        INTEGER      NOT NULL CHECK (weekly_hours >= 1),
    required_room_type  VARCHAR(100) NOT NULL CHECK (BTRIM(required_room_type) <> ''),
    sort_order          INTEGER      NOT NULL DEFAULT 1 CHECK (sort_order >= 1),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_components_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT chk_course_components_type
        CHECK (component_type IN ('GENERAL', 'THEORY', 'PRACTICE')),
    CONSTRAINT uq_course_components_type UNIQUE (course_id, component_type),
    CONSTRAINT uq_course_components_sort UNIQUE (course_id, sort_order)
);

CREATE TABLE teacher_courses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID        NOT NULL,
    course_id   UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_courses_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_courses_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_teacher_courses UNIQUE (teacher_id, course_id)
);

CREATE TABLE teacher_course_components (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id          UUID        NOT NULL,
    course_component_id UUID        NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_course_components_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_course_components_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE CASCADE,
    CONSTRAINT uq_teacher_course_components UNIQUE (teacher_id, course_component_id)
);

CREATE TABLE classroom_courses (
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

CREATE TABLE students (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID,
    code          VARCHAR(50)  NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    cycle         INTEGER      NOT NULL CHECK (cycle > 0),
    career        VARCHAR(255),
    credit_limit  INTEGER      NOT NULL DEFAULT 22 CHECK (credit_limit > 0),
    gpa           NUMERIC(4,2),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    facultad_id   UUID         NULL,
    carrera_id    UUID         NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_students_facultad
        FOREIGN KEY (facultad_id) REFERENCES facultades(id) ON DELETE SET NULL,
    CONSTRAINT fk_students_carrera
        FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE SET NULL,
    CONSTRAINT uq_students_code UNIQUE (code),
    CONSTRAINT uq_students_user_id UNIQUE (user_id),
    CONSTRAINT chk_students_gpa_range CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 20))
);

CREATE INDEX idx_students_gpa
    ON students(gpa DESC NULLS LAST)
    WHERE is_active = TRUE;

CREATE TABLE teacher_availability (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id   UUID         NOT NULL,
    time_slot_id UUID         NOT NULL,
    is_available BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_availability_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_availability_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
    CONSTRAINT uq_teacher_availability UNIQUE (teacher_id, time_slot_id)
);

CREATE TABLE classroom_availability (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID         NOT NULL,
    time_slot_id UUID         NOT NULL,
    is_available BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_classroom_availability_classroom
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_classroom_availability_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
    CONSTRAINT uq_classroom_availability UNIQUE (classroom_id, time_slot_id)
);

CREATE TABLE course_prerequisites (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id              UUID         NOT NULL,
    prerequisite_course_id UUID         NOT NULL,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_prereq_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_prereq_required
        FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_course_prerequisites UNIQUE (course_id, prerequisite_course_id),
    CONSTRAINT chk_course_prerequisites_self CHECK (course_id <> prerequisite_course_id)
);

CREATE TABLE student_completed_courses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID        NOT NULL,
    course_id    UUID        NOT NULL,
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_student_completed_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_completed_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_student_completed_courses UNIQUE (student_id, course_id)
);

CREATE TABLE teaching_schedules (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID         NOT NULL,
    version            INTEGER      NOT NULL DEFAULT 1 CHECK (version > 0),
    status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    created_by         UUID,
    confirmed_by       UUID,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    confirmed_at       TIMESTAMPTZ,

    CONSTRAINT fk_teaching_schedules_period
        FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_teaching_schedules_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_teaching_schedules_confirmed_by
        FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_teaching_schedules_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'))
);

CREATE UNIQUE INDEX uq_teaching_schedules_confirmed_per_period
    ON teaching_schedules(academic_period_id)
    WHERE status = 'CONFIRMED';

CREATE TABLE course_schedule_assignments (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_schedule_id UUID         NOT NULL,
    course_id            UUID         NOT NULL,
    course_component_id  UUID         NOT NULL,
    teacher_id           UUID         NOT NULL,
    assignment_status    VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    enrolled_count       INTEGER      NOT NULL DEFAULT 0,
    max_capacity         INTEGER      NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_schedule_assignments_schedule
        FOREIGN KEY (teaching_schedule_id) REFERENCES teaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_schedule_assignments_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_schedule_assignments_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_schedule_assignments_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_course_schedule_assignments_status CHECK (assignment_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    CONSTRAINT chk_csa_enrolled_count_nonneg CHECK (enrolled_count >= 0),
    CONSTRAINT chk_csa_max_capacity_nonneg   CHECK (max_capacity >= 0),
    CONSTRAINT chk_csa_enrolled_le_max       CHECK (enrolled_count <= max_capacity)
);

CREATE INDEX idx_csa_schedule_course
    ON course_schedule_assignments(teaching_schedule_id, course_id);

CREATE TABLE course_corequisites (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID         NOT NULL,
    corequisite_id  UUID         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_corequisites_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_corequisites_coreq
        FOREIGN KEY (corequisite_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_course_corequisites UNIQUE (course_id, corequisite_id),
    CONSTRAINT chk_course_corequisites_self CHECK (course_id <> corequisite_id)
);

CREATE INDEX idx_course_corequisites_course ON course_corequisites(course_id);
CREATE INDEX idx_course_corequisites_coreq  ON course_corequisites(corequisite_id);

CREATE TABLE course_assignment_slots (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_assignment_id  UUID        NOT NULL,
    teaching_schedule_id UUID         NOT NULL,
    course_id            UUID         NOT NULL,
    course_component_id  UUID         NOT NULL,
    teacher_id           UUID         NOT NULL,
    classroom_id         UUID         NOT NULL,
    time_slot_id         UUID         NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_assignment_slots_assignment
        FOREIGN KEY (course_assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_assignment_slots_schedule
        FOREIGN KEY (teaching_schedule_id) REFERENCES teaching_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_assignment_slots_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_assignment_slots_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT,
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

CREATE TABLE student_schedules (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         UUID         NOT NULL,
    academic_period_id UUID         NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    generated_by       UUID,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    confirmed_at       TIMESTAMPTZ,

    CONSTRAINT fk_student_schedules_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_schedules_period
        FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_schedules_generated_by
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_student_schedules_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'))
);

CREATE UNIQUE INDEX uq_student_schedules_active_per_period
    ON student_schedules(student_id, academic_period_id)
    WHERE status IN ('DRAFT', 'CONFIRMED');

CREATE TABLE student_schedule_items (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_schedule_id  UUID         NOT NULL,
    student_id           UUID         NOT NULL,
    course_id            UUID         NOT NULL,
    course_assignment_id UUID,
    item_status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_student_schedule_items_schedule
        FOREIGN KEY (student_schedule_id) REFERENCES student_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_schedule_items_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_schedule_items_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_student_schedule_items_assignment
        FOREIGN KEY (course_assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE SET NULL,
    CONSTRAINT uq_student_schedule_items_course UNIQUE (student_schedule_id, course_id),
    CONSTRAINT chk_student_schedule_items_status CHECK (item_status IN ('ACTIVE', 'REMOVED'))
);

CREATE INDEX idx_ssi_course_assignment ON student_schedule_items(course_assignment_id);

CREATE TABLE student_schedule_item_components (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_schedule_item_id UUID     NOT NULL,
    course_component_id  UUID         NOT NULL,
    course_assignment_id UUID         NOT NULL,
    item_status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ssic_item
        FOREIGN KEY (student_schedule_item_id) REFERENCES student_schedule_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssic_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ssic_assignment
        FOREIGN KEY (course_assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE RESTRICT,
    CONSTRAINT uq_ssic_item_component UNIQUE (student_schedule_item_id, course_component_id),
    CONSTRAINT chk_ssic_status CHECK (item_status IN ('ACTIVE', 'REMOVED'))
);

CREATE TABLE solver_runs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type         VARCHAR(20)  NOT NULL,
    academic_period_id UUID       NOT NULL,
    student_id       UUID,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    requested_by     UUID,
    time_limit_ms    INTEGER      NOT NULL DEFAULT 30000 CHECK (time_limit_ms > 0),
    input_hash       VARCHAR(128),
    result_summary   TEXT,
    started_at       TIMESTAMPTZ,
    finished_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_solver_runs_period
        FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_solver_runs_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_solver_runs_requested_by
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_solver_runs_type CHECK (run_type IN ('TEACHER', 'STUDENT')),
    CONSTRAINT chk_solver_runs_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'))
);

CREATE TABLE solver_run_conflicts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    solver_run_id   UUID         NOT NULL,
    conflict_type   VARCHAR(50)  NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     UUID,
    course_id       UUID,
    time_slot_id    UUID,
    message         TEXT         NOT NULL,
    details_json    JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_solver_run_conflicts_run
        FOREIGN KEY (solver_run_id) REFERENCES solver_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_solver_run_conflicts_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    CONSTRAINT fk_solver_run_conflicts_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL
);

CREATE TABLE schedule_feedback_events (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          VARCHAR(50)  NOT NULL,
    academic_period_id  UUID         NOT NULL,
    student_id          UUID,
    teaching_schedule_id UUID,
    student_schedule_id UUID,
    course_id           UUID,
    assignment_id       UUID,
    actor_user_id       UUID,
    event_payload_json  JSONB,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_schedule_feedback_events_period
        FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_feedback_events_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_feedback_events_teaching_schedule
        FOREIGN KEY (teaching_schedule_id) REFERENCES teaching_schedules(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_feedback_events_student_schedule
        FOREIGN KEY (student_schedule_id) REFERENCES student_schedules(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_feedback_events_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_feedback_events_assignment
        FOREIGN KEY (assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_feedback_events_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE ml_feature_snapshots (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type    VARCHAR(50)  NOT NULL,
    related_entity_type VARCHAR(50) NOT NULL,
    related_entity_id UUID        NOT NULL,
    features_json    JSONB        NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ml_training_runs (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name        VARCHAR(100) NOT NULL,
    dataset_version   VARCHAR(100) NOT NULL,
    target_name       VARCHAR(100) NOT NULL,
    library_name      VARCHAR(50)  NOT NULL,
    library_version   VARCHAR(50)  NOT NULL,
    metrics_json      JSONB,
    artifact_path     TEXT,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    started_at        TIMESTAMPTZ,
    finished_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_ml_training_runs_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'))
);

CREATE TABLE ml_model_registry (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name        VARCHAR(100) NOT NULL,
    model_type        VARCHAR(50)  NOT NULL,
    target_name       VARCHAR(100) NOT NULL,
    library_name      VARCHAR(50)  NOT NULL,
    library_version   VARCHAR(50)  NOT NULL,
    artifact_path     TEXT         NOT NULL,
    feature_schema_json JSONB      NOT NULL,
    metrics_json      JSONB,
    status            VARCHAR(20)  NOT NULL DEFAULT 'TRAINED',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    activated_at      TIMESTAMPTZ,

    CONSTRAINT chk_ml_model_registry_status CHECK (status IN ('TRAINED', 'ACTIVE', 'ARCHIVED'))
);

CREATE TABLE ml_prediction_logs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id         UUID         NOT NULL,
    solver_run_id     UUID,
    prediction_type  VARCHAR(50)  NOT NULL,
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    score            NUMERIC(12,6) NOT NULL,
    explanation_json JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ml_prediction_logs_model
        FOREIGN KEY (model_id) REFERENCES ml_model_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_prediction_logs_run
        FOREIGN KEY (solver_run_id) REFERENCES solver_runs(id) ON DELETE SET NULL
);

-- ============================================================
--  ÍNDICES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_oauth2_user_id ON oauth2_linked_accounts(user_id);
CREATE INDEX idx_oauth2_provider_subject ON oauth2_linked_accounts(provider, provider_subject);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(expires_at) WHERE revoked = FALSE;

CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_reset_token_hash ON password_reset_tokens(reset_token_hash) WHERE reset_token_hash IS NOT NULL;
CREATE INDEX idx_prt_active ON password_reset_tokens(user_id, expires_at) WHERE used = FALSE;

CREATE INDEX idx_carreras_facultad_id ON carreras(facultad_id);

CREATE INDEX idx_profiles_facultad_id ON profiles(facultad_id);
CREATE INDEX idx_profiles_carrera_id  ON profiles(carrera_id);

CREATE INDEX idx_time_slots_active ON time_slots(day_of_week, start_time) WHERE is_active = TRUE;

CREATE INDEX idx_teachers_user_id ON teachers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_teachers_active ON teachers(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_classrooms_active ON classrooms(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_courses_active ON courses(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_course_components_course_id ON course_components(course_id);
CREATE INDEX idx_course_components_active ON course_components(course_id, sort_order) WHERE is_active = TRUE;

CREATE INDEX idx_teacher_courses_teacher_id ON teacher_courses(teacher_id);
CREATE INDEX idx_teacher_courses_course_id ON teacher_courses(course_id);
CREATE INDEX idx_teacher_course_components_teacher_id ON teacher_course_components(teacher_id);
CREATE INDEX idx_teacher_course_components_component_id ON teacher_course_components(course_component_id);

CREATE INDEX idx_classroom_courses_classroom_id ON classroom_courses(classroom_id);
CREATE INDEX idx_classroom_courses_course_id   ON classroom_courses(course_id);

CREATE INDEX idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_students_active ON students(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_students_facultad_id ON students(facultad_id);
CREATE INDEX idx_students_carrera_id  ON students(carrera_id);

CREATE INDEX idx_teacher_availability_teacher_id ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_slot_id ON teacher_availability(time_slot_id);

CREATE INDEX idx_classroom_availability_classroom_id ON classroom_availability(classroom_id);
CREATE INDEX idx_classroom_availability_slot_id ON classroom_availability(time_slot_id);

CREATE INDEX idx_course_prerequisites_course_id ON course_prerequisites(course_id);
CREATE INDEX idx_course_prerequisites_required_id ON course_prerequisites(prerequisite_course_id);

CREATE INDEX idx_student_completed_courses_student_id ON student_completed_courses(student_id);
CREATE INDEX idx_student_completed_courses_course_id ON student_completed_courses(course_id);

CREATE INDEX idx_teaching_schedules_period_id ON teaching_schedules(academic_period_id);

CREATE INDEX idx_course_schedule_assignments_schedule_id ON course_schedule_assignments(teaching_schedule_id);
CREATE INDEX idx_course_schedule_assignments_course_id ON course_schedule_assignments(course_id);
CREATE INDEX idx_course_schedule_assignments_component_id ON course_schedule_assignments(course_component_id);
CREATE INDEX idx_course_schedule_assignments_teacher_id ON course_schedule_assignments(teacher_id);

CREATE INDEX idx_course_assignment_slots_schedule_id ON course_assignment_slots(teaching_schedule_id);
CREATE INDEX idx_course_assignment_slots_course_id ON course_assignment_slots(course_id);
CREATE INDEX idx_course_assignment_slots_component_id ON course_assignment_slots(course_component_id);
CREATE INDEX idx_course_assignment_slots_slot_id ON course_assignment_slots(time_slot_id);

CREATE INDEX idx_student_schedules_student_id ON student_schedules(student_id);
CREATE INDEX idx_student_schedules_period_id ON student_schedules(academic_period_id);

CREATE INDEX idx_student_schedule_items_schedule_id ON student_schedule_items(student_schedule_id);
CREATE INDEX idx_student_schedule_items_student_id ON student_schedule_items(student_id);
CREATE INDEX idx_student_schedule_items_course_id ON student_schedule_items(course_id);
CREATE INDEX idx_ssic_item_id ON student_schedule_item_components(student_schedule_item_id);
CREATE INDEX idx_ssic_component_id ON student_schedule_item_components(course_component_id);
CREATE INDEX idx_ssic_assignment_id ON student_schedule_item_components(course_assignment_id);

CREATE INDEX idx_solver_runs_period_id ON solver_runs(academic_period_id);
CREATE INDEX idx_solver_runs_student_id ON solver_runs(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_solver_runs_status ON solver_runs(status);

CREATE INDEX idx_solver_run_conflicts_run_id ON solver_run_conflicts(solver_run_id);

CREATE INDEX idx_schedule_feedback_events_period_id ON schedule_feedback_events(academic_period_id);

CREATE INDEX idx_ml_model_registry_status ON ml_model_registry(status);
CREATE INDEX idx_ml_prediction_logs_model_id ON ml_prediction_logs(model_id);
CREATE INDEX idx_ml_prediction_logs_run_id ON ml_prediction_logs(solver_run_id) WHERE solver_run_id IS NOT NULL;
