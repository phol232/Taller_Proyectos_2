--
-- PostgreSQL database dump
--

\restrict 6F0pCafk6QTHAmYWT2aP4egJooYGdGCSKfOx4PLjUHOt62oPO8iJGWPZAsnzPsU

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: day_of_week; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.day_of_week AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);


--
-- Name: sex_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sex_type AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'TEACHER',
    'STUDENT'
);


--
-- Name: fn_activate_academic_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_activate_academic_period(p_period_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE academic_periods
    SET    is_active = TRUE
    WHERE  id = p_period_id;
END;
$$;


--
-- Name: fn_add_classroom_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_classroom_courses(p_classroom_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT p_classroom_id, c.id
    FROM   courses c
    WHERE  c.id = ANY(p_course_ids)
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_add_classroom_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_classroom_courses_by_codes(p_classroom_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT p_classroom_id, c.id
    FROM   courses c
    WHERE  c.code = ANY(
        ARRAY(
                SELECT DISTINCT UPPER(TRIM(code_value))
                FROM   unnest(p_course_codes) AS code_value
                WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
        )
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_add_course_prerequisite_by_code(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_course_prerequisite_by_code(p_course_id uuid, p_prerequisite_code character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_prerequisite_id UUID;
BEGIN
    SELECT id INTO v_prerequisite_id
    FROM   courses
    WHERE  code = TRIM(p_prerequisite_code);

    IF v_prerequisite_id IS NULL THEN
        RAISE EXCEPTION 'El curso prerrequisito no existe: %', p_prerequisite_code;
    END IF;

    IF v_prerequisite_id = p_course_id THEN
        RAISE EXCEPTION 'Un curso no puede ser prerrequisito de sí mismo.';
    END IF;

    INSERT INTO course_prerequisites(course_id, prerequisite_course_id)
    VALUES (p_course_id, v_prerequisite_id)
    ON CONFLICT (course_id, prerequisite_course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_add_student_completed_course_by_code(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_student_completed_course_by_code(p_student_id uuid, p_course_code character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course_id UUID;
BEGIN
    SELECT id INTO v_course_id
    FROM   courses
    WHERE  code = TRIM(p_course_code);

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'El curso aprobado no existe: %', p_course_code;
    END IF;

    INSERT INTO student_completed_courses(student_id, course_id)
    VALUES (p_student_id, v_course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_add_teacher_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_teacher_courses(p_teacher_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.id = ANY(p_course_ids)
    ON CONFLICT (teacher_id, course_id) DO NOTHING;

    INSERT INTO teacher_course_components(teacher_id, course_component_id)
    SELECT p_teacher_id, cc.id
    FROM   course_components cc
    WHERE  cc.course_id = ANY(p_course_ids)
      AND  cc.is_active = TRUE
    ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
END;
$$;


--
-- Name: fn_add_teacher_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_teacher_courses_by_codes(p_teacher_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
    ON CONFLICT (teacher_id, course_id) DO NOTHING;

    INSERT INTO teacher_course_components(teacher_id, course_component_id)
    SELECT p_teacher_id, cc.id
    FROM   course_components cc
    JOIN   courses c ON c.id = cc.course_id
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
      AND  cc.is_active = TRUE
    ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
END;
$$;


--
-- Name: fn_builder_add_course(uuid, uuid, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_add_course(p_schedule_id uuid, p_course_component_id uuid, p_teacher_id uuid, p_section_id uuid, p_slots jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course_id      UUID;
    v_assignment_id  UUID;
    v_slot           JSONB;
BEGIN
    SELECT cc.course_id
    INTO v_course_id
    FROM course_components cc
    WHERE cc.id = p_course_component_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Componente de curso no encontrado: %', p_course_component_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO course_schedule_assignments (
        teaching_schedule_id, course_id, course_component_id, teacher_id,
        section_id, assignment_status
    )
    VALUES (
               p_schedule_id, v_course_id, p_course_component_id, p_teacher_id,
               p_section_id, 'DRAFT'
           )
    RETURNING id INTO v_assignment_id;

    IF p_slots IS NOT NULL AND JSONB_TYPEOF(p_slots) = 'array' THEN
        FOR v_slot IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_slots)
            LOOP
                INSERT INTO course_assignment_slots (
                    course_assignment_id, teaching_schedule_id, course_id, course_component_id,
                    teacher_id, classroom_id, time_slot_id, slot_start_time, slot_end_time
                )
                VALUES (
                           v_assignment_id, p_schedule_id, v_course_id, p_course_component_id,
                           p_teacher_id,
                           (v_slot ->> 'classroom_id')::UUID,
                           (v_slot ->> 'time_slot_id')::UUID,
                           (v_slot ->> 'start_time')::TIME,
                           (v_slot ->> 'end_time')::TIME
                       );
            END LOOP;
    END IF;

    RETURN v_assignment_id;
END;
$$;


--
-- Name: fn_builder_add_slot(uuid, uuid, uuid, time without time zone, time without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_add_slot(p_assignment_id uuid, p_classroom_id uuid, p_time_slot_id uuid, p_slot_start time without time zone, p_slot_end time without time zone) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_slot_id            UUID;
    v_schedule_id        UUID;
    v_course_id          UUID;
    v_course_component_id UUID;
    v_teacher_id         UUID;
BEGIN
    SELECT teaching_schedule_id, course_id, course_component_id, teacher_id
    INTO v_schedule_id, v_course_id, v_course_component_id, v_teacher_id
    FROM course_schedule_assignments
    WHERE id = p_assignment_id;

    IF v_schedule_id IS NULL THEN
        RAISE EXCEPTION 'Asignación no encontrada: %', p_assignment_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO course_assignment_slots (
        course_assignment_id, teaching_schedule_id, course_id, course_component_id,
        teacher_id, classroom_id, time_slot_id, slot_start_time, slot_end_time
    )
    VALUES (
               p_assignment_id, v_schedule_id, v_course_id, v_course_component_id,
               v_teacher_id, p_classroom_id, p_time_slot_id, p_slot_start, p_slot_end
           )
    RETURNING id INTO v_slot_id;

    UPDATE course_schedule_assignments
    SET updated_at = NOW()
    WHERE id = p_assignment_id;

    RETURN v_slot_id;
END;
$$;


--
-- Name: fn_builder_list_assignments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_list_assignments(p_schedule_id uuid) RETURNS TABLE(assignment_id uuid, course_id uuid, course_code character varying, course_name character varying, course_component_id uuid, component_type character varying, component_weekly_hours numeric, teacher_id uuid, teacher_code character varying, teacher_name character varying, section_id uuid, section_nrc character varying, assignment_status character varying, assigned_hours numeric, is_complete boolean, slots jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT csa.id,
               c.id,
               c.code,
               c.name,
               cc.id,
               cc.component_type,
               cc.weekly_hours,
               t.id,
               t.code,
               t.full_name,
               cs.id,
               cs.nrc::VARCHAR,
               csa.assignment_status,
               COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)::NUMERIC AS assigned_hours,
               COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)::NUMERIC >= cc.weekly_hours AS is_complete,
               COALESCE(
                               JSONB_AGG(
                               JSONB_BUILD_OBJECT(
                                       'slot_id',         cas.id,
                                       'time_slot_id',    cas.time_slot_id,
                                       'day_of_week',     ts.day_of_week,
                                       'start_time',      TO_CHAR(cas.slot_start_time, 'HH24:MI'),
                                       'end_time',        TO_CHAR(cas.slot_end_time,   'HH24:MI'),
                                       'classroom_id',    cas.classroom_id,
                                       'classroom_code',  cl.code,
                                       'classroom_name',  cl.name
                               )
                               ORDER BY ts.day_of_week, cas.slot_start_time
                                        ) FILTER (WHERE cas.id IS NOT NULL),
                               '[]'::JSONB
               ) AS slots
        FROM course_schedule_assignments csa
                 JOIN courses             c  ON c.id  = csa.course_id
                 JOIN course_components   cc ON cc.id = csa.course_component_id
                 JOIN teachers            t  ON t.id  = csa.teacher_id
                 LEFT JOIN course_sections     cs ON cs.id = csa.section_id
                 LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
                 LEFT JOIN time_slots          ts ON ts.id = cas.time_slot_id
                 LEFT JOIN classrooms          cl ON cl.id = cas.classroom_id
        WHERE csa.teaching_schedule_id = p_schedule_id
          AND csa.assignment_status <> 'CANCELLED'
        GROUP BY csa.id, c.id, c.code, c.name, cc.id, cc.component_type, cc.weekly_hours,
                 t.id, t.code, t.full_name, cs.id, cs.nrc, csa.assignment_status
        ORDER BY c.code, cc.sort_order;
END;
$$;


--
-- Name: fn_builder_remove_assignment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_remove_assignment(p_assignment_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT assignment_status INTO v_status
    FROM course_schedule_assignments
    WHERE id = p_assignment_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Asignación no encontrada: %', p_assignment_id USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM course_schedule_assignments WHERE id = p_assignment_id;
END;
$$;


--
-- Name: fn_builder_remove_slot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_remove_slot(p_slot_id uuid) RETURNS TABLE(assignment_id uuid, assignment_left_incomplete boolean, assigned_hours numeric, required_hours numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assignment_id UUID;
    v_required      NUMERIC;
    v_assigned      NUMERIC;
BEGIN
    SELECT cas.course_assignment_id
    INTO v_assignment_id
    FROM course_assignment_slots cas
    WHERE cas.id = p_slot_id;

    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'Franja no encontrada: %', p_slot_id USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM course_assignment_slots WHERE id = p_slot_id;

    SELECT cc.weekly_hours
    INTO v_required
    FROM course_schedule_assignments csa
             JOIN course_components cc ON cc.id = csa.course_component_id
    WHERE csa.id = v_assignment_id;

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)
    INTO v_assigned
    FROM course_assignment_slots cas
    WHERE cas.course_assignment_id = v_assignment_id;

    UPDATE course_schedule_assignments
    SET updated_at = NOW()
    WHERE id = v_assignment_id;

    RETURN QUERY SELECT v_assignment_id, v_assigned < v_required, v_assigned::NUMERIC, v_required::NUMERIC;
END;
$$;


--
-- Name: fn_builder_validate_slot(uuid, uuid, uuid, uuid, uuid, time without time zone, time without time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_builder_validate_slot(p_schedule_id uuid, p_assignment_id uuid, p_teacher_id uuid, p_classroom_id uuid, p_time_slot_id uuid, p_start_time time without time zone, p_end_time time without time zone, p_exclude_slot_id uuid DEFAULT NULL::uuid) RETURNS TABLE(conflict_type character varying, resource_id uuid, message character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT 'TEACHER_BUSY'::VARCHAR,
               cas.id,
               ('El docente ya tiene una clase asignada en ese horario.')::VARCHAR
        FROM course_assignment_slots cas
        WHERE cas.teaching_schedule_id = p_schedule_id
          AND cas.teacher_id          = p_teacher_id
          AND cas.time_slot_id        = p_time_slot_id
          AND cas.slot_start_time     = p_start_time
          AND cas.slot_end_time       = p_end_time
          AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);

    RETURN QUERY
        SELECT 'CLASSROOM_BUSY'::VARCHAR,
               cas.id,
               ('El aula ya está ocupada en ese horario.')::VARCHAR
        FROM course_assignment_slots cas
        WHERE cas.teaching_schedule_id = p_schedule_id
          AND cas.classroom_id        = p_classroom_id
          AND cas.time_slot_id        = p_time_slot_id
          AND cas.slot_start_time     = p_start_time
          AND cas.slot_end_time       = p_end_time
          AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);

    IF p_assignment_id IS NOT NULL THEN
        RETURN QUERY
            SELECT 'DUPLICATE'::VARCHAR,
                   cas.id,
                   ('La asignación ya contiene esa franja.')::VARCHAR
            FROM course_assignment_slots cas
            WHERE cas.course_assignment_id = p_assignment_id
              AND cas.time_slot_id        = p_time_slot_id
              AND cas.slot_start_time     = p_start_time
              AND cas.slot_end_time       = p_end_time
              AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);
    END IF;
END;
$$;


--
-- Name: fn_cancel_teaching_schedule(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cancel_teaching_schedule(p_schedule_id uuid, p_cancelled_by uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$ DECLARE v_status VARCHAR; BEGIN SELECT status INTO v_status FROM teaching_schedules WHERE id = p_schedule_id; IF v_status IS NULL OR v_status = 'CANCELLED' THEN RETURN; END IF; IF v_status = 'CONFIRMED' THEN RAISE EXCEPTION 'No se puede eliminar un horario confirmado: %', p_schedule_id USING ERRCODE = 'P0001'; END IF; UPDATE teaching_schedules SET status = 'CANCELLED', updated_at = NOW() WHERE id = p_schedule_id AND status = 'DRAFT'; UPDATE course_schedule_assignments SET assignment_status = 'CANCELLED', updated_at = NOW() WHERE teaching_schedule_id = p_schedule_id AND assignment_status = 'DRAFT'; END; $$;


--
-- Name: fn_clear_classroom_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_clear_classroom_availability(p_classroom_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM classroom_availability
    WHERE  classroom_id = p_classroom_id;
END;
$$;


--
-- Name: fn_clear_course_prerequisites(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_clear_course_prerequisites(p_course_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM course_prerequisites
    WHERE  course_id = p_course_id;
END;
$$;


--
-- Name: fn_clear_student_completed_courses(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_clear_student_completed_courses(p_student_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM student_completed_courses
    WHERE  student_id = p_student_id;
END;
$$;


--
-- Name: fn_clear_teacher_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_clear_teacher_availability(p_teacher_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM teacher_availability
    WHERE  teacher_id = p_teacher_id;
END;
$$;


--
-- Name: fn_confirm_teaching_schedule(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_confirm_teaching_schedule(p_schedule_id uuid, p_confirmed_by uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_period_id UUID;
BEGIN
    SELECT academic_period_id INTO v_period_id
      FROM teaching_schedules
     WHERE id = p_schedule_id
       AND status IN ('DRAFT', 'CONFIRMED');

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'Horario no encontrado o no confirmable: %', p_schedule_id
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE teaching_schedules
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE academic_period_id = v_period_id
       AND id <> p_schedule_id
       AND status IN ('DRAFT', 'CONFIRMED');

    UPDATE course_schedule_assignments csa
       SET assignment_status = 'CANCELLED', updated_at = NOW()
      FROM teaching_schedules ts
     WHERE ts.id = csa.teaching_schedule_id
       AND ts.academic_period_id = v_period_id
       AND ts.id <> p_schedule_id
       AND csa.assignment_status IN ('DRAFT', 'CONFIRMED');

    UPDATE teaching_schedules
       SET status = 'CONFIRMED',
           confirmed_by = p_confirmed_by,
           confirmed_at = NOW(),
           updated_at = NOW()
     WHERE id = p_schedule_id;

    UPDATE course_schedule_assignments
       SET assignment_status = 'CONFIRMED', updated_at = NOW()
     WHERE teaching_schedule_id = p_schedule_id
       AND assignment_status <> 'CANCELLED';

    RETURN p_schedule_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    starts_at date NOT NULL,
    ends_at date NOT NULL,
    status character varying(20) DEFAULT 'PLANNING'::character varying NOT NULL,
    max_student_credits integer DEFAULT 22 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT academic_periods_max_student_credits_check CHECK ((max_student_credits > 0)),
    CONSTRAINT chk_academic_periods_dates CHECK ((ends_at >= starts_at)),
    CONSTRAINT chk_academic_periods_status CHECK (((status)::text = ANY (ARRAY[('PLANNING'::character varying)::text, ('ACTIVE'::character varying)::text, ('CLOSED'::character varying)::text])))
);


--
-- Name: fn_create_academic_period(character varying, character varying, date, date, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_academic_period(p_code character varying, p_name character varying, p_starts_at date, p_ends_at date, p_status character varying, p_max_student_credits integer) RETURNS public.academic_periods
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_period academic_periods;
BEGIN
    INSERT INTO academic_periods(code, name, starts_at, ends_at, status, max_student_credits)
    VALUES (
               TRIM(p_code),
               TRIM(p_name),
               p_starts_at,
               p_ends_at,
               UPPER(TRIM(p_status)),
               COALESCE(p_max_student_credits, 22)
           )
    RETURNING * INTO v_period;

    RETURN v_period;
END;
$$;


--
-- Name: fn_create_academic_period(character varying, character varying, date, date, character varying, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_academic_period(p_code character varying, p_name character varying, p_starts_at date, p_ends_at date, p_status character varying, p_max_student_credits integer, p_is_active boolean DEFAULT true) RETURNS public.academic_periods
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_period academic_periods;
BEGIN
    INSERT INTO academic_periods(code, name, starts_at, ends_at, status, max_student_credits, is_active)
    VALUES (
               TRIM(p_code),
               TRIM(p_name),
               p_starts_at,
               p_ends_at,
               UPPER(TRIM(p_status)),
               COALESCE(p_max_student_credits, 22),
               COALESCE(p_is_active, TRUE)
           )
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;


--
-- Name: carreras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carreras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facultad_id uuid NOT NULL,
    code character varying(20),
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fn_create_carrera(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_carrera(p_facultad_id uuid, p_code character varying, p_name character varying) RETURNS public.carreras
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_row carreras%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facultades WHERE id = p_facultad_id) THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_facultad_id
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO carreras (facultad_id, code, name, is_active)
    VALUES (p_facultad_id, NULLIF(TRIM(p_code), ''), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;


--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    capacity integer NOT NULL,
    room_type character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    building_code character varying(20),
    CONSTRAINT classrooms_capacity_check CHECK ((capacity > 0))
);


--
-- Name: fn_create_classroom(character varying, character varying, integer, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_classroom(p_code character varying, p_name character varying, p_capacity integer, p_room_type character varying, p_is_active boolean) RETURNS public.classrooms
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    INSERT INTO classrooms(code, name, capacity, room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), p_capacity, TRIM(p_room_type), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_classroom;
    RETURN v_classroom;
END;
$$;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    credits integer NOT NULL,
    weekly_hours numeric(3,1) NOT NULL,
    required_room_type character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    required_credits integer DEFAULT 0 NOT NULL,
    cycle integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_courses_cycle CHECK (((cycle >= 1) AND (cycle <= 10))),
    CONSTRAINT chk_courses_required_credits CHECK ((required_credits >= 0)),
    CONSTRAINT chk_courses_required_room_type CHECK ((btrim((required_room_type)::text) <> ''::text)),
    CONSTRAINT courses_credits_check CHECK (((credits >= 1) AND (credits <= 6))),
    CONSTRAINT courses_weekly_hours_check CHECK ((weekly_hours > (0)::numeric))
);


--
-- Name: fn_create_course(character varying, character varying, integer, integer, integer, numeric, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course(p_code character varying, p_name character varying, p_cycle integer, p_credits integer, p_required_credits integer, p_weekly_hours numeric, p_required_room_type character varying, p_is_active boolean) RETURNS public.courses
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course courses;
    v_room_type VARCHAR(100);
BEGIN
    v_room_type := NULLIF(TRIM(p_required_room_type), '');

    IF v_room_type IS NULL THEN
        RAISE EXCEPTION 'El tipo de aula requerido es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO courses(code, name, cycle, credits, required_credits, weekly_hours, required_room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), COALESCE(p_cycle, 1), p_credits, COALESCE(p_required_credits, 0), p_weekly_hours, v_room_type, COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_course;

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    VALUES (v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active);

    RETURN v_course;
END;
$$;


--
-- Name: facultades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facultades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fn_create_facultad(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_facultad(p_code character varying, p_name character varying) RETURNS public.facultades
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    INSERT INTO facultades (code, name, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    code character varying(50) NOT NULL,
    full_name character varying(255) NOT NULL,
    cycle integer NOT NULL,
    career character varying(255),
    credit_limit integer DEFAULT 22 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    facultad_id uuid,
    carrera_id uuid,
    gpa numeric(4,2),
    CONSTRAINT chk_students_gpa_range CHECK (((gpa IS NULL) OR ((gpa >= (0)::numeric) AND (gpa <= (20)::numeric)))),
    CONSTRAINT students_credit_limit_check CHECK ((credit_limit > 0)),
    CONSTRAINT students_cycle_check CHECK ((cycle > 0))
);


--
-- Name: fn_create_student(uuid, character varying, character varying, integer, character varying, integer, boolean, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_student(p_user_id uuid, p_code character varying, p_full_name character varying, p_cycle integer, p_career character varying, p_credit_limit integer, p_is_active boolean, p_facultad_id uuid DEFAULT NULL::uuid, p_carrera_id uuid DEFAULT NULL::uuid) RETURNS public.students
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_student students;
BEGIN
    INSERT INTO students(user_id, code, full_name, cycle, career, credit_limit, is_active, facultad_id, carrera_id)
    VALUES (
               p_user_id,
               TRIM(p_code),
               TRIM(p_full_name),
               p_cycle,
               NULLIF(TRIM(COALESCE(p_career, '')), ''),
               COALESCE(p_credit_limit, 22),
               COALESCE(p_is_active, TRUE),
               p_facultad_id,
               p_carrera_id
           )
    RETURNING * INTO v_student;

    RETURN v_student;
END;
$$;


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    code character varying(50) NOT NULL,
    full_name character varying(255) NOT NULL,
    specialty character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fn_create_teacher(uuid, character varying, character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_teacher(p_user_id uuid, p_code character varying, p_full_name character varying, p_specialty character varying, p_is_active boolean) RETURNS public.teachers
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_teacher teachers;
BEGIN
    INSERT INTO teachers(user_id, code, full_name, specialty, is_active)
    VALUES (p_user_id, TRIM(p_code), TRIM(p_full_name), TRIM(p_specialty), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_teacher;
    RETURN v_teacher;
END;
$$;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    full_name character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fn_create_user(character varying, character varying, character varying, public.user_role, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_user(p_email character varying, p_password_hash character varying, p_full_name character varying, p_role public.user_role, p_is_active boolean DEFAULT true, p_email_verified boolean DEFAULT false) RETURNS public.users
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user users;
BEGIN
    INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        is_active,
        email_verified
    )
    VALUES (
        LOWER(TRIM(p_email)),
        p_password_hash,
        TRIM(p_full_name),
        p_role,
        COALESCE(p_is_active, TRUE),
        COALESCE(p_email_verified, FALSE)
    )
    RETURNING * INTO v_user;

    PERFORM fn_provision_user_academic_identity(v_user.id);

    RETURN v_user;
END;
$$;


--
-- Name: fn_deactivate_academic_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_academic_period(p_period_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE academic_periods
    SET    is_active = FALSE
    WHERE  id = p_period_id;
END;
$$;


--
-- Name: fn_deactivate_carrera(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_carrera(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE carreras
    SET is_active = FALSE
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;


--
-- Name: fn_deactivate_classroom(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_classroom(p_classroom_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE classrooms
    SET    is_active = FALSE
    WHERE  id = p_classroom_id;
END;
$$;


--
-- Name: fn_deactivate_course(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_course(p_course_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE courses
    SET    is_active = FALSE
    WHERE  id = p_course_id;
END;
$$;


--
-- Name: fn_deactivate_facultad(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_facultad(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE facultades
    SET is_active = FALSE
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Cascada lógica: desactivar también las carreras de la facultad.
    UPDATE carreras
    SET is_active = FALSE
    WHERE facultad_id = p_id;
END;
$$;


--
-- Name: fn_deactivate_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_student(p_student_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE students
    SET    is_active = FALSE
    WHERE  id = p_student_id;
END;
$$;


--
-- Name: fn_deactivate_teacher(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_teacher(p_teacher_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE teachers
    SET    is_active = FALSE
    WHERE  id = p_teacher_id;
END;
$$;


--
-- Name: fn_deactivate_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM fn_set_user_access_status(p_user_id, FALSE);
END;
$$;


--
-- Name: fn_delete_academic_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_academic_period(p_period_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_teaching_schedules      INTEGER;
    v_student_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_teaching_schedules
    FROM   teaching_schedules WHERE academic_period_id = p_period_id;

    IF v_teaching_schedules > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) docente(s) y no puede eliminarse.', v_teaching_schedules
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_schedules_count
    FROM   student_schedules WHERE academic_period_id = p_period_id;

    IF v_student_schedules_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) de estudiantes y no puede eliminarse.', v_student_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM academic_periods WHERE id = p_period_id;
END;
$$;


--
-- Name: fn_delete_all_expired_tokens(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_all_expired_tokens(p_now timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE  revoked    = TRUE
       OR  expires_at < p_now;
END;
$$;


--
-- Name: fn_delete_carrera(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_carrera(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM carreras WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;


--
-- Name: fn_delete_classroom(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_classroom(p_classroom_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_assignment_slots
    WHERE  classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % franja(s) asignada(s) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM classroom_courses WHERE classroom_id = p_classroom_id;
    DELETE FROM classroom_availability WHERE classroom_id = p_classroom_id;
    DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;


--
-- Name: fn_delete_course(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_course(p_course_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assignments_count   INTEGER;
    v_prereq_of_count     INTEGER;
    v_completed_count     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments WHERE course_id = p_course_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % asignación(es) de horario y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_prereq_of_count
    FROM   course_prerequisites WHERE prerequisite_course_id = p_course_id;

    IF v_prereq_of_count > 0 THEN
        RAISE EXCEPTION 'El curso es prerrequisito de % curso(s) y no puede eliminarse.', v_prereq_of_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_completed_count
    FROM   student_completed_courses WHERE course_id = p_course_id;

    IF v_completed_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % aprobación(es) por estudiantes y no puede eliminarse. Desactívelo en su lugar.', v_completed_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_prerequisites WHERE course_id = p_course_id;
    DELETE FROM courses WHERE id = p_course_id;
END;
$$;


--
-- Name: fn_delete_course_offering(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_course_offering(p_offering_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assignments_count INTEGER;
    v_student_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments
    WHERE  course_offering_id = p_offering_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % asignación(es) en horarios y no puede eliminarse. Cancélela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_items_count
    FROM   student_schedule_items
    WHERE  course_offering_id = p_offering_id;

    IF v_student_items_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % horario(s) de estudiante y no puede eliminarse. Cancélela en su lugar.', v_student_items_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_offering_classroom_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_teacher_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_offerings WHERE id = p_offering_id;
END;
$$;


--
-- Name: fn_delete_facultad(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_facultad(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- La FK de carreras tiene ON DELETE CASCADE.
    -- Las FKs de profiles/students tienen ON DELETE SET NULL.
    DELETE FROM facultades WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;


--
-- Name: fn_delete_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_student(p_student_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_schedules_count
    FROM   student_schedules
    WHERE  student_id = p_student_id;

    IF v_schedules_count > 0 THEN
        RAISE EXCEPTION 'El estudiante tiene % horario(s) generado(s) y no puede eliminarse. Desactívelo en su lugar.', v_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM student_completed_courses WHERE student_id = p_student_id;
    DELETE FROM students WHERE id = p_student_id;
END;
$$;


--
-- Name: fn_delete_teacher(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_teacher(p_teacher_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments
    WHERE  teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM teacher_courses WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_availability WHERE teacher_id = p_teacher_id;
    DELETE FROM teachers WHERE id = p_teacher_id;
END;
$$;


--
-- Name: fn_delete_user_expired_tokens(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_user_expired_tokens(p_user_id uuid, p_now timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE  user_id = p_user_id
      AND  (revoked = TRUE OR expires_at < p_now);
END;
$$;


--
-- Name: fn_ensure_time_slot(public.day_of_week, time without time zone, time without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ensure_time_slot(p_day_of_week public.day_of_week, p_start_time time without time zone, p_end_time time without time zone) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_slot_id UUID;
BEGIN
    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'La franja horaria es inválida.';
    END IF;

    INSERT INTO time_slots(day_of_week, start_time, end_time, slot_order, is_active)
    VALUES (
               p_day_of_week,
               p_start_time,
               p_end_time,
               EXTRACT(HOUR FROM p_start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM p_start_time)::INTEGER,
               TRUE
           )
    ON CONFLICT (day_of_week, start_time, end_time) DO UPDATE
        SET is_active = TRUE
    RETURNING id INTO v_slot_id;

    RETURN v_slot_id;
END;
$$;


--
-- Name: fn_find_courses_by_codes(character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_find_courses_by_codes(p_codes character varying[]) RETURNS SETOF public.courses
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    IF p_codes IS NULL OR array_length(p_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT *
        FROM   courses
        WHERE  code = ANY(p_codes)
        ORDER  BY code ASC;
END;
$$;


--
-- Name: fn_generate_unique_nrc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generate_unique_nrc() RETURNS character
    LANGUAGE plpgsql
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


--
-- Name: fn_get_academic_period_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_academic_period_by_id(p_period_id uuid) RETURNS public.academic_periods
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_period academic_periods;
BEGIN
    SELECT * INTO v_period
    FROM   academic_periods
    WHERE  id = p_period_id;
    RETURN v_period;
END;
$$;


--
-- Name: fn_get_active_student_schedule(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_active_student_schedule(p_student_id uuid, p_period_id uuid) RETURNS TABLE(schedule_id uuid, status character varying, items jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        WITH active AS (
            SELECT ss.id, ss.status
            FROM student_schedules ss
            WHERE ss.student_id = p_student_id
              AND ss.academic_period_id = p_period_id
              AND ss.status IN ('DRAFT', 'CONFIRMED')
            LIMIT 1
        ),
             items AS (
                 SELECT ssi.id              AS item_id,
                        ssi.course_id,
                        JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                                'course_component_id',   ssic.course_component_id,
                                'course_assignment_id',  ssic.course_assignment_id
                        )
                        ORDER BY ssic.course_component_id
                                 ) FILTER (WHERE ssic.id IS NOT NULL) AS components_json
                 FROM student_schedule_items ssi
                          JOIN active a ON a.id = ssi.student_schedule_id
                          LEFT JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
                 WHERE ssi.item_status = 'ACTIVE'
                 GROUP BY ssi.id, ssi.course_id
             )
        SELECT a.id,
               a.status::VARCHAR,
               COALESCE(
                       (SELECT JSONB_AGG(
                                       JSONB_BUILD_OBJECT(
                                               'student_schedule_item_id', i.item_id,
                                               'course_id',                i.course_id,
                                               'components',               COALESCE(i.components_json, '[]'::JSONB)
                                       )
                               ) FROM items i),
                       '[]'::JSONB
               )
        FROM active a;
END;
$$;


--
-- Name: fn_get_classroom_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_classroom_by_id(p_classroom_id uuid) RETURNS public.classrooms
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    SELECT * INTO v_classroom
    FROM   classrooms
    WHERE  id = p_classroom_id;
    RETURN v_classroom;
END;
$$;


--
-- Name: fn_get_course_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_course_by_id(p_course_id uuid) RETURNS public.courses
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_course courses;
BEGIN
    SELECT * INTO v_course
    FROM   courses
    WHERE  id = p_course_id;
    RETURN v_course;
END;
$$;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    dni character varying(20),
    phone character varying(20),
    sex public.sex_type,
    age smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    facultad_id uuid,
    carrera_id uuid,
    preferred_shift character varying(20),
    CONSTRAINT chk_profiles_preferred_shift CHECK (((preferred_shift IS NULL) OR ((preferred_shift)::text = ANY ((ARRAY['MORNING'::character varying, 'AFTERNOON'::character varying, 'EVENING'::character varying, 'FLEXIBLE'::character varying, 'AFTERNOON,MORNING'::character varying, 'AFTERNOON,EVENING'::character varying, 'EVENING,MORNING'::character varying])::text[])))),
    CONSTRAINT profiles_age_check CHECK (((age IS NULL) OR ((age >= 0) AND (age <= 150))))
);


--
-- Name: fn_get_profile_by_user_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_profile_by_user_id(p_user_id uuid) RETURNS public.profiles
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_profile profiles;
BEGIN
    SELECT * INTO v_profile
    FROM   profiles
    WHERE  user_id = p_user_id;

    RETURN v_profile;
END;
$$;


--
-- Name: fn_get_schedule_timetable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_schedule_timetable(p_teaching_schedule_id uuid) RETURNS TABLE(slot_id uuid, classroom_id uuid, classroom_code character varying, classroom_name character varying, classroom_type character varying, teacher_id uuid, teacher_code character varying, teacher_name character varying, course_id uuid, course_code character varying, course_name character varying, component_type character varying, section_id uuid, nrc character, section_number smallint, day_of_week public.day_of_week, start_time time without time zone, end_time time without time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        cas.id                  AS slot_id,
        cl.id                   AS classroom_id,
        cl.code                 AS classroom_code,
        cl.name                 AS classroom_name,
        cl.room_type            AS classroom_type,
        t.id                    AS teacher_id,
        t.code                  AS teacher_code,
        t.full_name             AS teacher_name,
        c.id                    AS course_id,
        c.code                  AS course_code,
        c.name                  AS course_name,
        cc.component_type       AS component_type,
        cs.id                   AS section_id,
        cs.nrc                  AS nrc,
        cs.section_number       AS section_number,
        ts.day_of_week          AS day_of_week,
        cas.slot_start_time     AS start_time,
        cas.slot_end_time       AS end_time
    FROM course_assignment_slots cas
    JOIN time_slots ts              ON ts.id  = cas.time_slot_id
    JOIN classrooms cl              ON cl.id  = cas.classroom_id
    JOIN teachers t                 ON t.id   = cas.teacher_id
    JOIN courses c                  ON c.id   = cas.course_id
    JOIN course_components cc       ON cc.id  = cas.course_component_id
    JOIN course_schedule_assignments csa
                                    ON csa.id = cas.course_assignment_id
    LEFT JOIN course_sections cs    ON cs.id  = csa.section_id
    WHERE cas.teaching_schedule_id = p_teaching_schedule_id
    ORDER BY cl.code ASC, ts.day_of_week ASC, cas.slot_start_time ASC;
END;
$$;


--
-- Name: fn_get_student_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_by_id(p_student_id uuid) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
               s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
               u.email, s.created_at, s.updated_at
        FROM   students s
                   LEFT JOIN users u ON u.id = s.user_id
        WHERE  s.id = p_student_id;
END;
$$;


--
-- Name: fn_get_student_by_user_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_by_user_id(p_user_id uuid) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
               s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
               u.email, s.created_at, s.updated_at
        FROM   students s
                   LEFT JOIN users u ON u.id = s.user_id
        WHERE  s.user_id = p_user_id;
END;
$$;


--
-- Name: fn_get_teacher_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_teacher_by_id(p_teacher_id uuid) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, specialty character varying, is_active boolean, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.id = p_teacher_id;
END;
$$;


--
-- Name: fn_invalidate_user_prt(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_invalidate_user_prt(p_user_id uuid, p_now timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE password_reset_tokens
    SET    used    = TRUE,
           used_at = p_now
    WHERE  user_id = p_user_id
      AND  used    = FALSE;
END;
$$;


--
-- Name: fn_list_active_time_slots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_active_time_slots() RETURNS TABLE(id uuid, day_of_week character varying, start_time time without time zone, end_time time without time zone, slot_order integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ts.id,
               ts.day_of_week::VARCHAR,
               ts.start_time,
               ts.end_time,
               ts.slot_order
        FROM time_slots ts
        WHERE ts.is_active = TRUE
          AND ts.start_time >= TIME '07:00'
          AND ts.end_time   <= TIME '22:30'
        ORDER BY ts.day_of_week, ts.slot_order;
END;
$$;


--
-- Name: fn_list_all_academic_periods(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_academic_periods() RETURNS SETOF public.academic_periods
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   academic_periods
        ORDER  BY starts_at DESC, code ASC;
END;
$$;


--
-- Name: fn_list_all_carreras_by_facultad(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_carreras_by_facultad(p_facultad_id uuid) RETURNS SETOF public.carreras
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   carreras
        WHERE  facultad_id = p_facultad_id
        ORDER  BY name ASC;
END;
$$;


--
-- Name: fn_list_all_classrooms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_classrooms() RETURNS SETOF public.classrooms
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   classrooms
        ORDER  BY code ASC;
END;
$$;


--
-- Name: fn_list_all_courses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_courses() RETURNS SETOF public.courses
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   courses
        ORDER  BY code ASC;
END;
$$;


--
-- Name: fn_list_all_facultades(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_facultades() RETURNS SETOF public.facultades
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   facultades
        ORDER  BY name ASC;
END;
$$;


--
-- Name: fn_list_all_students(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_students() RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
               s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
               u.email, s.created_at, s.updated_at
        FROM   students s
                   LEFT JOIN users u ON u.id = s.user_id
        ORDER  BY s.full_name ASC;
END;
$$;


--
-- Name: fn_list_all_teachers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_teachers() RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, specialty character varying, is_active boolean, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    ORDER  BY t.full_name ASC;
END;
$$;


--
-- Name: fn_list_all_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_users() RETURNS SETOF public.users
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   users
    ORDER  BY created_at DESC;
END;
$$;


--
-- Name: fn_list_carreras(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_carreras() RETURNS SETOF public.carreras
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   carreras
        WHERE  is_active = TRUE
        ORDER  BY name ASC;
END;
$$;


--
-- Name: fn_list_carreras_by_facultad(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_carreras_by_facultad(p_facultad_id uuid) RETURNS SETOF public.carreras
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   carreras
        WHERE  facultad_id = p_facultad_id
          AND  is_active = TRUE
        ORDER  BY name ASC;
END;
$$;


--
-- Name: fn_list_classroom_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_classroom_availability(p_classroom_id uuid) RETURNS TABLE(day_of_week public.day_of_week, start_time time without time zone, end_time time without time zone, is_available boolean)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ts.day_of_week, ts.start_time, ts.end_time, ca.is_available
        FROM   classroom_availability ca
                   JOIN   time_slots ts ON ts.id = ca.time_slot_id
        WHERE  ca.classroom_id = p_classroom_id
        ORDER  BY ts.day_of_week, ts.start_time;
END;
$$;


--
-- Name: fn_list_classroom_course_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_classroom_course_codes(p_classroom_id uuid) RETURNS TABLE(course_code character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.code
        FROM   classroom_courses cc
                   JOIN   courses c ON c.id = cc.course_id
        WHERE  cc.classroom_id = p_classroom_id
        ORDER  BY c.code ASC;
END;
$$;


--
-- Name: fn_list_classroom_course_component_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_classroom_course_component_ids(p_classroom_id uuid) RETURNS TABLE(course_component_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ccc.course_component_id
        FROM   classroom_course_components ccc
        WHERE  ccc.classroom_id = p_classroom_id
        ORDER  BY ccc.course_component_id;
END;
$$;


--
-- Name: fn_list_classroom_courses(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_classroom_courses(p_classroom_id uuid) RETURNS TABLE(course_id uuid, course_code character varying, course_name character varying, cycle integer, credits integer, weekly_hours numeric, required_room_type character varying, is_active boolean)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.id, c.code, c.name, c.cycle, c.credits,
               c.weekly_hours, c.required_room_type, c.is_active
        FROM   classroom_courses cc
                   JOIN   courses c ON c.id = cc.course_id
        WHERE  cc.classroom_id = p_classroom_id
        ORDER  BY c.code ASC;
END;
$$;


--
-- Name: fn_list_classrooms_paged(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_classrooms_paged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, code character varying, name character varying, capacity integer, room_type character varying, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cl.id, cl.code, cl.name, cl.capacity, cl.room_type,
               cl.is_active, cl.created_at, cl.updated_at,
               COUNT(*) OVER()::BIGINT AS total_count
        FROM   classrooms cl
        ORDER  BY cl.code ASC
        LIMIT  GREATEST(p_page_size, 1)
            OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_list_course_classroom_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_classroom_ids(p_course_id uuid) RETURNS TABLE(classroom_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cl.id
        FROM   classroom_courses cc
                   JOIN   classrooms cl ON cl.id = cc.classroom_id
        WHERE  cc.course_id = p_course_id
        ORDER  BY cl.code ASC;
END;
$$;


--
-- Name: fn_list_course_components(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_components(p_course_id uuid) RETURNS TABLE(id uuid, component_type character varying, weekly_hours numeric, required_room_type character varying, sort_order integer, is_active boolean)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cc.id, cc.component_type, cc.weekly_hours, cc.required_room_type,
               cc.sort_order, cc.is_active
        FROM   course_components cc
        WHERE  cc.course_id = p_course_id
        ORDER  BY cc.sort_order ASC, cc.component_type ASC;
END;
$$;


--
-- Name: fn_list_course_prerequisite_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_prerequisite_codes(p_course_id uuid) RETURNS TABLE(prerequisite_code character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.code
        FROM   course_prerequisites cp
                   JOIN   courses c ON c.id = cp.prerequisite_course_id
        WHERE  cp.course_id = p_course_id
        ORDER  BY c.code ASC;
END;
$$;


--
-- Name: fn_list_course_sections(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_sections(p_teaching_schedule_id uuid) RETURNS TABLE(id uuid, course_id uuid, course_code character varying, course_name character varying, nrc character, section_number smallint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cs.id,
               cs.course_id,
               c.code,
               c.name,
               cs.nrc,
               cs.section_number
        FROM course_sections cs
                 JOIN courses c ON c.id = cs.course_id
        WHERE cs.teaching_schedule_id = p_teaching_schedule_id
          AND cs.is_active = TRUE
        ORDER BY c.code ASC, cs.section_number ASC;
END;
$$;


--
-- Name: fn_list_course_teacher_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_teacher_ids(p_course_id uuid) RETURNS TABLE(teacher_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id
    FROM   teacher_courses tc
    JOIN   teachers t ON t.id = tc.teacher_id
    WHERE  tc.course_id = p_course_id
    ORDER  BY t.full_name ASC;
END;
$$;


--
-- Name: fn_list_courses_paged(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_courses_paged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, code character varying, name character varying, cycle integer, credits integer, required_credits integer, weekly_hours numeric, required_room_type character varying, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits, c.weekly_hours,
               c.required_room_type, c.is_active, c.created_at, c.updated_at,
               COUNT(*) OVER()::BIGINT AS total_count
        FROM   courses c
        ORDER  BY c.code ASC
        LIMIT  GREATEST(p_page_size, 1)
            OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_list_facultades(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_facultades() RETURNS SETOF public.facultades
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   facultades
        WHERE  is_active = TRUE
        ORDER  BY name ASC;
END;
$$;


--
-- Name: fn_list_student_completed_course_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_student_completed_course_codes(p_student_id uuid) RETURNS TABLE(course_code character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.code
        FROM   student_completed_courses scc
                   JOIN   courses c ON c.id = scc.course_id
        WHERE  scc.student_id = p_student_id
        ORDER  BY c.code ASC;
END;
$$;


--
-- Name: fn_list_student_pending_courses(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_student_pending_courses(p_student_id uuid, p_period_id uuid) RETURNS TABLE(course_id uuid, course_code character varying, course_name character varying, course_cycle integer, course_credits integer, course_weekly_hours numeric, required_components integer, sections jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_schedule_id UUID;
    v_student_cycle INTEGER;
BEGIN
    SELECT s.cycle INTO v_student_cycle
    FROM students s
    WHERE s.id = p_student_id;

    IF v_student_cycle IS NULL THEN
        RAISE EXCEPTION 'Estudiante no encontrado: %', p_student_id USING ERRCODE = 'P0001';
    END IF;

    SELECT ts.id INTO v_schedule_id
    FROM teaching_schedules ts
    WHERE ts.academic_period_id = p_period_id
      AND ts.status = 'CONFIRMED'
    LIMIT 1;

    -- Si no hay horario publicado, devolvemos los cursos pendientes
    -- sin secciones para que la UI muestre el estado vacío correcto.

    RETURN QUERY
        WITH courses_in_plan AS (
            SELECT c.*
            FROM courses c
            WHERE c.is_active = TRUE
              AND c.cycle <= v_student_cycle
              AND NOT EXISTS (
                SELECT 1 FROM student_completed_courses scc
                WHERE scc.student_id = p_student_id
                  AND scc.course_id  = c.id
            )
        ),
             component_counts AS (
                 SELECT cc.course_id, COUNT(*)::INTEGER AS component_count
                 FROM course_components cc
                 WHERE cc.is_active = TRUE
                 GROUP BY cc.course_id
             ),
             assignment_slots AS (
                 SELECT csa.id                        AS assignment_id,
                        csa.course_id,
                        csa.course_component_id,
                        csa.section_id,
                        csa.teacher_id,
                        cc.component_type             AS component_type,
                        cc.sort_order                 AS component_order,
                        cc.weekly_hours               AS component_weekly_hours,
                        t.code                        AS teacher_code,
                        t.full_name                   AS teacher_name,
                        COALESCE(
                                        JSONB_AGG(
                                        JSONB_BUILD_OBJECT(
                                                'slot_id',        cas.id,
                                                'time_slot_id',   cas.time_slot_id,
                                                'day_of_week',    ts.day_of_week,
                                                'start_time',     TO_CHAR(cas.slot_start_time, 'HH24:MI'),
                                                'end_time',       TO_CHAR(cas.slot_end_time,   'HH24:MI'),
                                                'classroom_id',   cas.classroom_id,
                                                'classroom_code', cl.code,
                                                'classroom_name', cl.name
                                        )
                                        ORDER BY ts.day_of_week, cas.slot_start_time
                                                 ) FILTER (WHERE cas.id IS NOT NULL),
                                        '[]'::JSONB
                        )                              AS slots_json
                 FROM course_schedule_assignments csa
                          JOIN course_components cc ON cc.id = csa.course_component_id
                          JOIN teachers          t  ON t.id  = csa.teacher_id
                          LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
                          LEFT JOIN time_slots ts ON ts.id = cas.time_slot_id
                          LEFT JOIN classrooms cl ON cl.id = cas.classroom_id
                 WHERE csa.teaching_schedule_id = v_schedule_id
                   AND csa.assignment_status   <> 'CANCELLED'
                 GROUP BY csa.id, csa.course_id, csa.course_component_id, csa.section_id,
                          csa.teacher_id, cc.component_type, cc.sort_order, cc.weekly_hours,
                          t.code, t.full_name
             ),
             section_components AS (
                 SELECT a.course_id,
                        a.section_id,
                        cs.nrc,
                        cs.section_number,
                        JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                        'assignment_id',         a.assignment_id,
                                        'course_component_id',   a.course_component_id,
                                        'component_type',        a.component_type,
                                        'component_weekly_hours', a.component_weekly_hours,
                                        'teacher_id',            a.teacher_id,
                                        'teacher_code',          a.teacher_code,
                                        'teacher_name',          a.teacher_name,
                                        'slots',                 a.slots_json
                                )
                                ORDER BY a.component_order
                        ) AS components_json
                 FROM assignment_slots a
                          LEFT JOIN course_sections cs ON cs.id = a.section_id
                 WHERE a.section_id IS NOT NULL
                 GROUP BY a.course_id, a.section_id, cs.nrc, cs.section_number
             ),
             course_sections_agg AS (
                 SELECT sc.course_id,
                        COALESCE(
                                JSONB_AGG(
                                        JSONB_BUILD_OBJECT(
                                                'section_id',     sc.section_id,
                                                'nrc',            sc.nrc,
                                                'section_number', sc.section_number,
                                                'components',     sc.components_json
                                        )
                                        ORDER BY sc.section_number
                                ),
                                '[]'::JSONB
                        ) AS sections_json
                 FROM section_components sc
                 GROUP BY sc.course_id
             )
        SELECT  cip.id,
                cip.code,
                cip.name,
                cip.cycle,
                cip.credits,
                cip.weekly_hours,
                COALESCE(cc.component_count, 0),
                COALESCE(csa.sections_json, '[]'::JSONB)
        FROM courses_in_plan cip
                 LEFT JOIN component_counts   cc  ON cc.course_id  = cip.id
                 LEFT JOIN course_sections_agg csa ON csa.course_id = cip.id
        ORDER BY cip.cycle, cip.code;
END;
$$;


--
-- Name: fn_list_students_paged(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_students_paged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    ORDER  BY s.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_list_teacher_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_teacher_availability(p_teacher_id uuid) RETURNS TABLE(day_of_week public.day_of_week, start_time time without time zone, end_time time without time zone, is_available boolean)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT ts.day_of_week, ts.start_time, ts.end_time, ta.is_available
    FROM   teacher_availability ta
    JOIN   time_slots ts ON ts.id = ta.time_slot_id
    WHERE  ta.teacher_id = p_teacher_id
    ORDER  BY ts.day_of_week, ts.start_time;
END;
$$;


--
-- Name: fn_list_teacher_course_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_teacher_course_codes(p_teacher_id uuid) RETURNS TABLE(course_code character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   teacher_courses tc
    JOIN   courses c ON c.id = tc.course_id
    WHERE  tc.teacher_id = p_teacher_id
    ORDER  BY c.code ASC;
END;
$$;


--
-- Name: fn_list_teacher_course_component_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_teacher_course_component_ids(p_teacher_id uuid) RETURNS TABLE(course_component_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT tcc.course_component_id
    FROM   teacher_course_components tcc
    JOIN   course_components cc ON cc.id = tcc.course_component_id
    JOIN   courses c ON c.id = cc.course_id
    WHERE  tcc.teacher_id = p_teacher_id
    ORDER  BY c.code ASC, cc.sort_order ASC;
END;
$$;


--
-- Name: fn_list_teachers_paged(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_teachers_paged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, specialty character varying, is_active boolean, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    ORDER  BY t.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_list_teaching_schedule_options(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_teaching_schedule_options(p_academic_period_id uuid) RETURNS TABLE(id uuid, academic_period_id uuid, status character varying, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, confirmed_at timestamp with time zone, solver_run_id uuid, seed integer, offer_count integer, slot_count integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT ts.id, ts.academic_period_id, ts.status, ts.created_by,
           ts.created_at, ts.updated_at, ts.confirmed_at,
           sr.id, sr.seed,
           COALESCE(COUNT(DISTINCT csa.id), 0)::INTEGER,
           COALESCE(COUNT(cas.id), 0)::INTEGER
      FROM teaching_schedules ts
 LEFT JOIN solver_runs sr ON sr.teaching_schedule_id = ts.id
 LEFT JOIN course_schedule_assignments csa ON csa.teaching_schedule_id = ts.id
 LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
     WHERE ts.academic_period_id = p_academic_period_id
       AND ts.status IN ('DRAFT', 'CONFIRMED')
  GROUP BY ts.id, sr.id, sr.seed
  ORDER BY ts.created_at DESC;
END;
$$;


--
-- Name: fn_list_users_paged(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_users_paged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, email character varying, password_hash character varying, full_name character varying, role public.user_role, is_active boolean, email_verified boolean, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    ORDER  BY u.created_at DESC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_notify_solver_inputs_changed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_solver_inputs_changed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('solver_inputs_changed', TG_TABLE_NAME);
    RETURN NULL;
END;
$$;


--
-- Name: fn_provision_user_academic_identity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_provision_user_academic_identity(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user users;
    v_academic_code VARCHAR(50);
BEGIN
    SELECT * INTO v_user
    FROM   users
    WHERE  id = p_user_id;

    IF v_user.id IS NULL THEN
        RETURN;
    END IF;

    v_academic_code := UPPER(
        LEFT(REGEXP_REPLACE(SPLIT_PART(v_user.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g'), 50)
    );

    IF v_user.role = 'STUDENT'::user_role
       AND NOT EXISTS (SELECT 1 FROM students WHERE user_id = v_user.id) THEN
        INSERT INTO students(user_id, code, full_name, cycle, career, credit_limit, is_active)
        VALUES (v_user.id, v_academic_code, v_user.full_name, 1, NULL, 22, v_user.is_active);
    ELSIF v_user.role = 'TEACHER'::user_role
       AND NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user.id) THEN
        INSERT INTO teachers(user_id, code, full_name, specialty, is_active)
        VALUES (v_user.id, v_academic_code, v_user.full_name, 'Sin especialidad', v_user.is_active);
    END IF;
END;
$$;


--
-- Name: fn_remove_classroom_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_remove_classroom_courses(p_classroom_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id
      AND course_id = ANY(p_course_ids);
END;
$$;


--
-- Name: fn_remove_classroom_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_remove_classroom_courses_by_codes(p_classroom_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM classroom_courses cc
        USING courses c
    WHERE cc.classroom_id = p_classroom_id
      AND cc.course_id = c.id
      AND c.code = ANY(
        ARRAY(
                SELECT DISTINCT UPPER(TRIM(code_value))
                FROM   unnest(p_course_codes) AS code_value
                WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
        );
END;
$$;


--
-- Name: fn_remove_teacher_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_remove_teacher_courses(p_teacher_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id
       AND course_id = ANY(p_course_ids);

    DELETE FROM teacher_course_components tcc
    USING course_components cc
    WHERE tcc.teacher_id = p_teacher_id
      AND tcc.course_component_id = cc.id
      AND cc.course_id = ANY(p_course_ids);
END;
$$;


--
-- Name: fn_remove_teacher_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_remove_teacher_courses_by_codes(p_teacher_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses tc
    USING courses c
    WHERE tc.teacher_id = p_teacher_id
      AND tc.course_id = c.id
      AND c.code = ANY(
          ARRAY(
              SELECT DISTINCT UPPER(TRIM(code_value))
              FROM   unnest(p_course_codes) AS code_value
              WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
          )
      );

    DELETE FROM teacher_course_components tcc
    USING course_components cc
    JOIN courses c ON c.id = cc.course_id
    WHERE tcc.teacher_id = p_teacher_id
      AND tcc.course_component_id = cc.id
      AND c.code = ANY(
          ARRAY(
              SELECT DISTINCT UPPER(TRIM(code_value))
              FROM   unnest(p_course_codes) AS code_value
              WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
          )
      );
END;
$$;


--
-- Name: fn_replace_course_components(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_replace_course_components(p_course_id uuid, p_components jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_component      JSONB;
    v_component_id   UUID;
    v_saved_id       UUID;
    v_keep_ids       UUID[] := ARRAY[]::UUID[];
    v_type           VARCHAR(20);
    v_room_type      VARCHAR(100);
    v_weekly_hours   NUMERIC(3,1);
    v_sort_order     INTEGER;
    v_is_active      BOOLEAN;
    v_general_count  INTEGER;
    v_specific_count INTEGER;
    v_hours_sum      NUMERIC(6,1);
BEGIN
    IF p_components IS NULL OR jsonb_typeof(p_components) <> 'array'
        OR jsonb_array_length(p_components) = 0 THEN
        RAISE EXCEPTION 'El curso debe tener al menos un componente horario.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'El curso no existe.'
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) = 'GENERAL'),
           COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) IN ('THEORY', 'PRACTICE')),
           COALESCE(SUM((elem->>'weeklyHours')::NUMERIC(3,1)), 0)
    INTO   v_general_count, v_specific_count, v_hours_sum
    FROM   jsonb_array_elements(p_components) AS elem;

    IF v_general_count > 0 AND v_specific_count > 0 THEN
        RAISE EXCEPTION 'No se puede mezclar GENERAL con THEORY/PRACTICE.'
            USING ERRCODE = '22023';
    END IF;

    IF v_general_count > 1 THEN
        RAISE EXCEPTION 'Un curso solo puede tener un componente GENERAL.'
            USING ERRCODE = '22023';
    END IF;

    IF v_general_count = 0 AND v_specific_count = 0 THEN
        RAISE EXCEPTION 'Los componentes deben ser GENERAL, THEORY o PRACTICE.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE course_components
    SET    sort_order = sort_order + 10000
    WHERE  course_id = p_course_id;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
        LOOP
            v_component_id := NULLIF(v_component->>'id', '')::UUID;
            v_type := UPPER(TRIM(v_component->>'componentType'));
            v_weekly_hours := (v_component->>'weeklyHours')::NUMERIC(3,1);
            v_room_type := NULLIF(TRIM(COALESCE(v_component->>'requiredRoomType', '')), '');
            v_sort_order := COALESCE((v_component->>'sortOrder')::INTEGER, 1);
            v_is_active := COALESCE((v_component->>'isActive')::BOOLEAN, TRUE);

            IF v_type NOT IN ('GENERAL', 'THEORY', 'PRACTICE') THEN
                RAISE EXCEPTION 'Tipo de componente inválido: %', v_type
                    USING ERRCODE = '22023';
            END IF;

            IF v_weekly_hours <= 0 THEN
                RAISE EXCEPTION 'Las horas del componente deben ser mayores a 0.'
                    USING ERRCODE = '22023';
            END IF;

            IF v_room_type IS NULL THEN
                RAISE EXCEPTION 'El tipo de aula del componente es obligatorio.'
                    USING ERRCODE = '22023';
            END IF;

            IF v_component_id IS NOT NULL AND EXISTS (
                SELECT 1
                FROM   course_components cc
                WHERE  cc.id = v_component_id
                  AND  cc.course_id = p_course_id
            ) THEN
                UPDATE course_components
                SET    component_type     = v_type,
                       weekly_hours       = v_weekly_hours,
                       required_room_type = v_room_type,
                       sort_order         = v_sort_order,
                       is_active          = v_is_active,
                       updated_at         = NOW()
                WHERE  id = v_component_id
                RETURNING id INTO v_saved_id;
            ELSIF EXISTS (
                SELECT 1
                FROM   course_components cc
                WHERE  cc.course_id = p_course_id
                  AND  cc.component_type = v_type
            ) THEN
                UPDATE course_components
                SET    weekly_hours       = v_weekly_hours,
                       required_room_type = v_room_type,
                       sort_order         = v_sort_order,
                       is_active          = v_is_active,
                       updated_at         = NOW()
                WHERE  course_id = p_course_id
                  AND  component_type = v_type
                RETURNING id INTO v_saved_id;
            ELSE
                INSERT INTO course_components(
                    course_id, component_type, weekly_hours, required_room_type,
                    sort_order, is_active
                )
                VALUES (
                           p_course_id, v_type, v_weekly_hours, v_room_type,
                           v_sort_order, v_is_active
                       )
                RETURNING id INTO v_saved_id;
            END IF;

            v_keep_ids := array_append(v_keep_ids, v_saved_id);
        END LOOP;

    DELETE FROM course_components
    WHERE  course_id = p_course_id
      AND  NOT (id = ANY(v_keep_ids));
END;
$$;


--
-- Name: fn_revoke_all_user_tokens(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_revoke_all_user_tokens(p_user_id uuid, p_now timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE refresh_tokens
    SET    revoked    = TRUE,
           revoked_at = p_now
    WHERE  user_id = p_user_id
      AND  revoked  = FALSE;
END;
$$;


--
-- Name: fn_revoke_refresh_token(character varying, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_revoke_refresh_token(p_token_hash character varying, p_now timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE refresh_tokens
    SET    revoked    = TRUE,
           revoked_at = p_now
    WHERE  token_hash = p_token_hash
      AND  revoked    = FALSE;
END;
$$;


--
-- Name: fn_save_student_schedule(uuid, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_student_schedule(p_student_id uuid, p_period_id uuid, p_actor_id uuid, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_schedule_id        UUID;
    v_published_id       UUID;
    v_existing_status    VARCHAR;
    v_existing_id        UUID;
    v_credit_limit       INTEGER;
    v_total_credits      INTEGER := 0;
    v_item               JSONB;
    v_course_id          UUID;
    v_assignment_id_text TEXT;
    v_assignment_id      UUID;
    v_required_components INTEGER;
    v_supplied_components INTEGER;
    v_invalid_count      INTEGER;
    v_completed_count    INTEGER;
    v_item_id            UUID;
    v_component_id       UUID;
BEGIN
    IF p_items IS NULL OR JSONB_TYPEOF(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Selección vacía o con formato inválido.' USING ERRCODE = 'P0001';
    END IF;

    SELECT s.credit_limit INTO v_credit_limit
    FROM students s
    WHERE s.id = p_student_id;

    IF v_credit_limit IS NULL THEN
        RAISE EXCEPTION 'Estudiante no encontrado: %', p_student_id USING ERRCODE = 'P0001';
    END IF;

    SELECT ts.id INTO v_published_id
    FROM teaching_schedules ts
    WHERE ts.academic_period_id = p_period_id
      AND ts.status = 'CONFIRMED'
    LIMIT 1;

    IF v_published_id IS NULL THEN
        RAISE EXCEPTION 'No hay horario publicado para el período.' USING ERRCODE = 'P0001';
    END IF;

    -- Bloquea si ya hay un CONFIRMED. Si hay DRAFT, lo reusamos.
    SELECT ss.id, ss.status INTO v_existing_id, v_existing_status
    FROM student_schedules ss
    WHERE ss.student_id = p_student_id
      AND ss.academic_period_id = p_period_id
      AND ss.status IN ('DRAFT', 'CONFIRMED')
    LIMIT 1;

    IF v_existing_status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'El estudiante ya tiene un horario confirmado para el período.' USING ERRCODE = 'P0001';
    END IF;

    -- Validar y sumar créditos por curso
    FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
        LOOP
            v_course_id := (v_item ->> 'course_id')::UUID;

            IF v_course_id IS NULL THEN
                RAISE EXCEPTION 'course_id faltante en la selección.' USING ERRCODE = 'P0001';
            END IF;

            SELECT COUNT(*) INTO v_completed_count
            FROM student_completed_courses scc
            WHERE scc.student_id = p_student_id
              AND scc.course_id  = v_course_id;
            IF v_completed_count > 0 THEN
                RAISE EXCEPTION 'El curso % ya está aprobado.', v_course_id USING ERRCODE = 'P0001';
            END IF;

            SELECT COUNT(*) INTO v_required_components
            FROM course_components cc
            WHERE cc.course_id = v_course_id
              AND cc.is_active = TRUE;

            SELECT JSONB_ARRAY_LENGTH(v_item -> 'assignment_ids') INTO v_supplied_components;

            IF COALESCE(v_supplied_components, 0) < v_required_components THEN
                RAISE EXCEPTION 'Selección incompleta para el curso %. Requeridos % componente(s).',
                    v_course_id, v_required_components USING ERRCODE = 'P0001';
            END IF;

            -- Validar que cada assignment pertenezca al horario publicado y al curso
            SELECT COUNT(*) INTO v_invalid_count
            FROM JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids') aid_text
                     LEFT JOIN course_schedule_assignments csa ON csa.id = aid_text::UUID
            WHERE csa.id IS NULL
               OR csa.teaching_schedule_id <> v_published_id
               OR csa.course_id <> v_course_id
               OR csa.assignment_status = 'CANCELLED';

            IF v_invalid_count > 0 THEN
                RAISE EXCEPTION 'Asignaciones inválidas para el curso %.', v_course_id USING ERRCODE = 'P0001';
            END IF;

            SELECT v_total_credits + c.credits INTO v_total_credits
            FROM courses c WHERE c.id = v_course_id;
        END LOOP;

    IF v_total_credits > v_credit_limit THEN
        RAISE EXCEPTION 'La selección excede el límite de créditos (%/%).',
            v_total_credits, v_credit_limit USING ERRCODE = 'P0001';
    END IF;

    -- Borrar contenido previo del DRAFT o crear uno nuevo
    IF v_existing_id IS NOT NULL THEN
        v_schedule_id := v_existing_id;
        DELETE FROM student_schedule_items WHERE student_schedule_id = v_schedule_id;
        UPDATE student_schedules
        SET updated_at = NOW(), generated_by = p_actor_id
        WHERE id = v_schedule_id;
    ELSE
        INSERT INTO student_schedules (student_id, academic_period_id, status, generated_by)
        VALUES (p_student_id, p_period_id, 'DRAFT', p_actor_id)
        RETURNING id INTO v_schedule_id;
    END IF;

    -- Insertar items y components
    FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
        LOOP
            v_course_id := (v_item ->> 'course_id')::UUID;

            INSERT INTO student_schedule_items
            (student_schedule_id, student_id, course_id, item_status)
            VALUES (v_schedule_id, p_student_id, v_course_id, 'ACTIVE')
            RETURNING id INTO v_item_id;

            FOR v_assignment_id_text IN
                SELECT JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids')
                LOOP
                    v_assignment_id := v_assignment_id_text::UUID;

                    SELECT csa.course_component_id INTO v_component_id
                    FROM course_schedule_assignments csa
                    WHERE csa.id = v_assignment_id;

                    INSERT INTO student_schedule_item_components
                    (student_schedule_item_id, course_component_id, course_assignment_id, item_status)
                    VALUES (v_item_id, v_component_id, v_assignment_id, 'ACTIVE');
                END LOOP;

            -- Vincular el item al primer assignment (compatibilidad con consultas existentes)
            UPDATE student_schedule_items
            SET course_assignment_id = (
                SELECT aid::UUID
                FROM JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids') aid
                LIMIT 1
            )
            WHERE id = v_item_id;
        END LOOP;

    RETURN v_schedule_id;
END;
$$;


--
-- Name: fn_search_academic_periods(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_academic_periods(p_query character varying) RETURNS SETOF public.academic_periods
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   academic_periods
        WHERE  code ILIKE '%' || p_query || '%'
           OR  name ILIKE '%' || p_query || '%'
           OR  status ILIKE '%' || p_query || '%'
        ORDER  BY starts_at DESC, code ASC;
END;
$$;


--
-- Name: fn_search_classrooms(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_classrooms(p_query character varying) RETURNS SETOF public.classrooms
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   classrooms
        WHERE  code ILIKE '%' || p_query || '%'
           OR  name ILIKE '%' || p_query || '%'
           OR  room_type ILIKE '%' || p_query || '%'
        ORDER  BY code ASC;
END;
$$;


--
-- Name: fn_search_classrooms_paged(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_classrooms_paged(p_query character varying, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, code character varying, name character varying, capacity integer, room_type character varying, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cl.id, cl.code, cl.name, cl.capacity, cl.room_type,
               cl.is_active, cl.created_at, cl.updated_at,
               COUNT(*) OVER()::BIGINT AS total_count
        FROM   classrooms cl
        WHERE  cl.code      ILIKE '%' || p_query || '%'
           OR  cl.name      ILIKE '%' || p_query || '%'
           OR  cl.room_type ILIKE '%' || p_query || '%'
        ORDER  BY cl.code ASC
        LIMIT  GREATEST(p_page_size, 1)
            OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_search_courses(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_courses(p_query character varying) RETURNS SETOF public.courses
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   courses
        WHERE  unaccent(LOWER(code)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
           OR  unaccent(LOWER(name)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
        ORDER  BY code ASC;
END;
$$;


--
-- Name: fn_search_courses_paged(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_courses_paged(p_query character varying, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, code character varying, name character varying, cycle integer, credits integer, required_credits integer, weekly_hours numeric, required_room_type character varying, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits, c.weekly_hours,
               c.required_room_type, c.is_active, c.created_at, c.updated_at,
               COUNT(*) OVER()::BIGINT AS total_count
        FROM   courses c
        WHERE  unaccent(LOWER(c.code)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
           OR  unaccent(LOWER(c.name)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
        ORDER  BY c.code ASC
        LIMIT  GREATEST(p_page_size, 1)
            OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_search_students(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_students(p_query character varying) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
               s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
               u.email, s.created_at, s.updated_at
        FROM   students s
                   LEFT JOIN users u ON u.id = s.user_id
        WHERE  s.code      ILIKE '%' || p_query || '%'
           OR  s.full_name ILIKE '%' || p_query || '%'
           OR  s.career    ILIKE '%' || p_query || '%'
           OR  u.email     ILIKE '%' || p_query || '%'
        ORDER  BY s.full_name ASC;
END;
$$;


--
-- Name: fn_search_students_paged(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_students_paged(p_query character varying, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, cycle integer, career character varying, credit_limit integer, is_active boolean, facultad_id uuid, carrera_id uuid, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE  s.code      ILIKE '%' || p_query || '%'
       OR  s.full_name ILIKE '%' || p_query || '%'
       OR  s.career    ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY s.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_search_teachers(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_teachers(p_query character varying) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, specialty character varying, is_active boolean, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.code ILIKE '%' || p_query || '%'
       OR  t.full_name ILIKE '%' || p_query || '%'
       OR  t.specialty ILIKE '%' || p_query || '%'
       OR  u.email ILIKE '%' || p_query || '%'
    ORDER  BY t.full_name ASC;
END;
$$;


--
-- Name: fn_search_teachers_paged(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_teachers_paged(p_query character varying, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, user_id uuid, code character varying, full_name character varying, specialty character varying, is_active boolean, email character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.code      ILIKE '%' || p_query || '%'
       OR  t.full_name ILIKE '%' || p_query || '%'
       OR  t.specialty ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY t.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_search_users_by_name(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_users_by_name(p_query character varying) RETURNS SETOF public.users
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   users
    WHERE  full_name ILIKE '%' || p_query || '%'
    ORDER  BY full_name ASC;
END;
$$;


--
-- Name: fn_search_users_paged(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_users_paged(p_query character varying, p_page integer DEFAULT 1, p_page_size integer DEFAULT 12) RETURNS TABLE(id uuid, email character varying, password_hash character varying, full_name character varying, role public.user_role, is_active boolean, email_verified boolean, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    WHERE  u.full_name ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY u.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;


--
-- Name: fn_set_classroom_availability(uuid, public.day_of_week, time without time zone, time without time zone, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_classroom_availability(p_classroom_id uuid, p_day_of_week public.day_of_week, p_start_time time without time zone, p_end_time time without time zone, p_is_available boolean) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_time_slot_id UUID;
BEGIN
    v_time_slot_id := fn_ensure_time_slot(p_day_of_week, p_start_time, p_end_time);
    INSERT INTO classroom_availability(classroom_id, time_slot_id, is_available)
    VALUES (p_classroom_id, v_time_slot_id, COALESCE(p_is_available, TRUE))
    ON CONFLICT (classroom_id, time_slot_id) DO UPDATE
        SET is_available = EXCLUDED.is_available;
END;
$$;


--
-- Name: fn_set_classroom_course_components(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_classroom_course_components(p_classroom_id uuid, p_component_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Borrar asignaciones anteriores de componentes
    DELETE FROM classroom_course_components
    WHERE  classroom_id = p_classroom_id;

    IF p_component_ids IS NULL OR array_length(p_component_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Insertar nuevas asignaciones de componentes
    INSERT INTO classroom_course_components(classroom_id, course_component_id)
    SELECT p_classroom_id, comp.id
    FROM   course_components comp
    WHERE  comp.id = ANY(p_component_ids)
    ON CONFLICT (classroom_id, course_component_id) DO NOTHING;

    -- Sincronizar classroom_courses: agregar los cursos padre de los componentes
    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT DISTINCT p_classroom_id, comp.course_id
    FROM   course_components comp
    WHERE  comp.id = ANY(p_component_ids)
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_set_classroom_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_classroom_courses(p_classroom_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id;

    PERFORM fn_add_classroom_courses(p_classroom_id, p_course_ids);
END;
$$;


--
-- Name: fn_set_classroom_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_classroom_courses_by_codes(p_classroom_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id;

    PERFORM fn_add_classroom_courses_by_codes(p_classroom_id, p_course_codes);
END;
$$;


--
-- Name: fn_set_teacher_availability(uuid, public.day_of_week, time without time zone, time without time zone, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_teacher_availability(p_teacher_id uuid, p_day_of_week public.day_of_week, p_start_time time without time zone, p_end_time time without time zone, p_is_available boolean) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_time_slot_id UUID;
BEGIN
    v_time_slot_id := fn_ensure_time_slot(p_day_of_week, p_start_time, p_end_time);
    INSERT INTO teacher_availability(teacher_id, time_slot_id, is_available)
    VALUES (p_teacher_id, v_time_slot_id, COALESCE(p_is_available, TRUE))
    ON CONFLICT (teacher_id, time_slot_id) DO UPDATE
        SET is_available = EXCLUDED.is_available;
END;
$$;


--
-- Name: fn_set_teacher_course_components(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_teacher_course_components(p_teacher_id uuid, p_component_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    IF p_component_ids IS NOT NULL AND array_length(p_component_ids, 1) IS NOT NULL THEN
        INSERT INTO teacher_course_components(teacher_id, course_component_id)
        SELECT p_teacher_id, cc.id
        FROM   course_components cc
        WHERE  cc.id = ANY(p_component_ids)
          AND  cc.is_active = TRUE
        ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
    END IF;

    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT DISTINCT p_teacher_id, cc.course_id
    FROM   teacher_course_components tcc
    JOIN   course_components cc ON cc.id = tcc.course_component_id
    WHERE  tcc.teacher_id = p_teacher_id
    ON CONFLICT (teacher_id, course_id) DO NOTHING;
END;
$$;


--
-- Name: fn_set_teacher_courses(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_teacher_courses(p_teacher_id uuid, p_course_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses(p_teacher_id, p_course_ids);
END;
$$;


--
-- Name: fn_set_teacher_courses_by_codes(uuid, character varying[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_teacher_courses_by_codes(p_teacher_id uuid, p_course_codes character varying[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses_by_codes(p_teacher_id, p_course_codes);
END;
$$;


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: fn_set_user_access_status(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_user_access_status(p_user_id uuid, p_is_active boolean) RETURNS public.users
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user users;
BEGIN
    UPDATE users
    SET    is_active = COALESCE(p_is_active, FALSE),
           email_verified = COALESCE(p_is_active, FALSE)
    WHERE  id = p_user_id;

    UPDATE students
    SET    is_active = COALESCE(p_is_active, FALSE)
    WHERE  user_id = p_user_id;

    UPDATE teachers
    SET    is_active = COALESCE(p_is_active, FALSE)
    WHERE  user_id = p_user_id;

    SELECT * INTO v_user
    FROM   users
    WHERE  id = p_user_id;

    RETURN v_user;
END;
$$;


--
-- Name: fn_solver_add_conflicts(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_add_conflicts(p_run_id uuid, p_conflicts jsonb) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_conflicts IS NULL OR jsonb_array_length(p_conflicts) = 0 THEN
        RETURN 0;
    END IF;

    INSERT INTO solver_run_conflicts (
        solver_run_id, conflict_type, resource_type, resource_id,
        course_id, time_slot_id, message, details_json
    )
    SELECT p_run_id,
           NULLIF(elem->>'conflict_type', ''),
           NULLIF(elem->>'resource_type', ''),
           NULLIF(elem->>'resource_id', '')::UUID,
           NULLIF(elem->>'course_id', '')::UUID,
           NULLIF(elem->>'time_slot_id', '')::UUID,
           COALESCE(elem->>'message', ''),
           CASE WHEN elem ? 'details' AND jsonb_typeof(elem->'details') <> 'null'
                    THEN elem->'details'
                ELSE NULL
               END
    FROM jsonb_array_elements(p_conflicts) AS elem;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


--
-- Name: fn_solver_consume_generation_reservation(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_consume_generation_reservation(p_reservation_id uuid, p_actor_id uuid, p_academic_period_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE solver_generation_reservations
       SET status = 'CONSUMED',
           consumed_at = NOW(),
           updated_at = NOW()
     WHERE id = p_reservation_id
       AND actor_id = p_actor_id
       AND academic_period_id = p_academic_period_id
       AND status = 'ACCEPTED'
       AND expires_at >= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count = 1;
END;
$$;


--
-- Name: fn_solver_create_run(character varying, uuid, uuid, uuid, integer, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_create_run(p_run_type character varying, p_academic_period_id uuid, p_student_id uuid, p_requested_by uuid, p_time_limit_ms integer, p_input_hash character varying, p_seed integer DEFAULT NULL::integer) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO solver_runs (run_type, academic_period_id, student_id,
                             status, requested_by, seed, time_limit_ms,
                             input_hash, started_at)
    VALUES (UPPER(TRIM(p_run_type)), p_academic_period_id, p_student_id,
            'RUNNING', p_requested_by, p_seed,
            COALESCE(p_time_limit_ms, 30000), p_input_hash, NOW())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


--
-- Name: fn_solver_finish_run(uuid, character varying, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_finish_run(p_run_id uuid, p_status character varying, p_summary text, p_teaching_schedule_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE solver_runs
       SET status = UPPER(TRIM(p_status)),
           result_summary = p_summary,
           teaching_schedule_id = COALESCE(p_teaching_schedule_id, teaching_schedule_id),
           finished_at = NOW(),
           updated_at = NOW()
     WHERE id = p_run_id;
END;
$$;


--
-- Name: fn_solver_get_confirmed_teaching_schedule(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_get_confirmed_teaching_schedule(p_period_id uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id
    FROM teaching_schedules
    WHERE academic_period_id = p_period_id
      AND status = 'CONFIRMED'
    LIMIT 1;
    RETURN v_id;
END;
$$;


--
-- Name: fn_solver_get_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_get_period(p_period_id uuid) RETURNS TABLE(id uuid, max_student_credits integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ap.id, ap.max_student_credits
        FROM academic_periods ap
        WHERE ap.id = p_period_id;
END;
$$;


--
-- Name: fn_solver_get_run(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_get_run(p_run_id uuid) RETURNS TABLE(id uuid, run_type character varying, academic_period_id uuid, student_id uuid, teaching_schedule_id uuid, status character varying, requested_by uuid, seed integer, time_limit_ms integer, input_hash character varying, result_summary text, started_at timestamp with time zone, finished_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT sr.id, sr.run_type, sr.academic_period_id, sr.student_id,
           sr.teaching_schedule_id, sr.status, sr.requested_by, sr.seed,
           sr.time_limit_ms, sr.input_hash, sr.result_summary,
           sr.started_at, sr.finished_at, sr.created_at
      FROM solver_runs sr
     WHERE sr.id = p_run_id;
END;
$$;


--
-- Name: fn_solver_list_active_classrooms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_active_classrooms() RETURNS TABLE(id uuid, code character varying, name character varying, capacity integer, room_type character varying, building_code character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT r.id, r.code, r.name, r.capacity, r.room_type, r.building_code
        FROM classrooms r
        WHERE r.is_active = TRUE;
END;
$$;


--
-- Name: fn_solver_list_active_course_components(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_active_course_components() RETURNS TABLE(id uuid, course_id uuid, component_type character varying, weekly_hours numeric, required_room_type character varying, sort_order integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cc.id,
               cc.course_id,
               cc.component_type,
               cc.weekly_hours,
               cc.required_room_type,
               cc.sort_order
        FROM course_components cc
                 JOIN courses c ON c.id = cc.course_id
        WHERE c.is_active = TRUE
          AND cc.is_active = TRUE
        ORDER BY c.code ASC, cc.sort_order ASC;
END;
$$;


--
-- Name: fn_solver_list_active_courses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_active_courses() RETURNS TABLE(id uuid, code character varying, name character varying, cycle integer, credits integer, required_credits integer, weekly_hours numeric, required_room_type character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits,
               c.weekly_hours, c.required_room_type
        FROM courses c
        WHERE c.is_active = TRUE;
END;
$$;


--
-- Name: fn_solver_list_active_teachers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_active_teachers() RETURNS TABLE(id uuid, code character varying, full_name character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT t.id, t.code, t.full_name
        FROM teachers t
        WHERE t.is_active = TRUE;
END;
$$;


--
-- Name: fn_solver_list_active_time_slots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_active_time_slots() RETURNS TABLE(id uuid, day_of_week text, start_time time without time zone, end_time time without time zone, slot_order integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ts.id,
               ts.day_of_week::TEXT,
               ts.start_time,
               ts.end_time,
               ts.slot_order
        FROM time_slots ts
        WHERE ts.is_active = TRUE
        ORDER BY ts.day_of_week, ts.slot_order;
END;
$$;


--
-- Name: fn_solver_list_building_travel_times(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_building_travel_times() RETURNS TABLE(building_a character varying, building_b character varying, minutes integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT b.building_a, b.building_b, b.minutes FROM building_travel_times b;
END;
$$;


--
-- Name: fn_solver_list_classroom_availability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_classroom_availability() RETURNS TABLE(classroom_id uuid, time_slot_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ca.classroom_id, ca.time_slot_id
        FROM classroom_availability ca
        WHERE ca.is_available = TRUE;
END;
$$;


--
-- Name: fn_solver_list_classroom_course_components(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_classroom_course_components() RETURNS TABLE(classroom_id uuid, course_component_id uuid)
    LANGUAGE plpgsql STABLE
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


--
-- Name: fn_solver_list_classroom_courses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_classroom_courses() RETURNS TABLE(classroom_id uuid, course_id uuid)
    LANGUAGE plpgsql STABLE
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


--
-- Name: fn_solver_list_completed_courses(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_completed_courses(p_student_ids uuid[]) RETURNS TABLE(student_id uuid, course_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT scc.student_id, scc.course_id
        FROM student_completed_courses scc
        WHERE scc.approved_at IS NOT NULL
          AND (p_student_ids IS NULL OR scc.student_id = ANY(p_student_ids));
END;
$$;


--
-- Name: fn_solver_list_course_corequisites(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_course_corequisites() RETURNS TABLE(course_id uuid, corequisite_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cc.course_id, cc.corequisite_id FROM course_corequisites cc;
END;
$$;


--
-- Name: fn_solver_list_course_prerequisites(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_course_prerequisites() RETURNS TABLE(course_id uuid, prerequisite_course_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cp.course_id, cp.prerequisite_course_id FROM course_prerequisites cp;
END;
$$;


--
-- Name: fn_solver_list_course_rules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_course_rules() RETURNS TABLE(course_id uuid, scheduling_kind character varying, elective_group_code character varying, max_sections integer, priority integer, placement_strategy character varying)
    LANGUAGE plpgsql STABLE
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


--
-- Name: fn_solver_list_offer_vacancies(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_offer_vacancies(p_teaching_schedule_id uuid) RETURNS TABLE(assignment_id uuid, course_id uuid, course_component_id uuid, teacher_id uuid, classroom_id uuid, max_capacity integer, enrolled_count integer, time_slot_ids uuid[], slot_start_times time without time zone[], slot_end_times time without time zone[], section_id uuid, nrc character, section_number smallint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT csa.id,
           csa.course_id,
           csa.course_component_id,
           csa.teacher_id,
           (SELECT cas.classroom_id
              FROM course_assignment_slots cas
             WHERE cas.course_assignment_id = csa.id
             LIMIT 1),
           csa.max_capacity,
           csa.enrolled_count,
           COALESCE(
             (SELECT array_agg(cas.time_slot_id ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::UUID[]
           ),
           COALESCE(
             (SELECT array_agg(cas.slot_start_time ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::TIME[]
           ),
           COALESCE(
             (SELECT array_agg(cas.slot_end_time ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::TIME[]
           ),
           cs.id,
           cs.nrc,
           cs.section_number
      FROM course_schedule_assignments csa
      LEFT JOIN course_sections cs ON cs.id = csa.section_id
     WHERE csa.teaching_schedule_id = p_teaching_schedule_id
       AND csa.assignment_status IN ('DRAFT', 'CONFIRMED');
END;
$$;


--
-- Name: fn_solver_list_run_conflicts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_run_conflicts(p_run_id uuid) RETURNS TABLE(conflict_type character varying, resource_type character varying, resource_id uuid, course_id uuid, time_slot_id uuid, message text, details_json jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT src.conflict_type, src.resource_type, src.resource_id,
               src.course_id, src.time_slot_id, src.message, src.details_json,
               src.created_at
        FROM solver_run_conflicts src
        WHERE src.solver_run_id = p_run_id
        ORDER BY src.created_at ASC;
END;
$$;


--
-- Name: fn_solver_list_students(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_students(p_student_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, code character varying, full_name character varying, cycle integer, credit_limit integer, gpa numeric, preferred_shift character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT s.id,
               s.code,
               s.full_name,
               s.cycle,
               s.credit_limit,
               s.gpa,
               p.preferred_shift
        FROM students s
                 LEFT JOIN profiles p ON p.user_id = s.user_id
        WHERE s.is_active = TRUE
          AND (p_student_id IS NULL OR s.id = p_student_id);
END;
$$;


--
-- Name: fn_solver_list_teacher_availability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_teacher_availability() RETURNS TABLE(teacher_id uuid, time_slot_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT ta.teacher_id, ta.time_slot_id
        FROM teacher_availability ta
        WHERE ta.is_available = TRUE;
END;
$$;


--
-- Name: fn_solver_list_teacher_course_components(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_teacher_course_components() RETURNS TABLE(teacher_id uuid, course_component_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT tcc.teacher_id, tcc.course_component_id
        FROM teacher_course_components tcc;
END;
$$;


--
-- Name: fn_solver_list_teacher_courses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_list_teacher_courses() RETURNS TABLE(teacher_id uuid, course_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY SELECT tc.teacher_id, tc.course_id FROM teacher_courses tc;
END;
$$;


--
-- Name: fn_solver_persist_student_schedule(uuid, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_persist_student_schedule(p_student_id uuid, p_academic_period_id uuid, p_generated_by uuid, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_schedule_id UUID;
    v_item        JSONB;
    v_component   JSONB;
    v_item_id     UUID;
    v_course_id   UUID;
    v_assign_id   UUID;
    v_component_id UUID;
BEGIN
    UPDATE student_schedules
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE student_id = p_student_id
      AND academic_period_id = p_academic_period_id
      AND status = 'DRAFT';

    INSERT INTO student_schedules (student_id, academic_period_id, status, generated_by)
    VALUES (p_student_id, p_academic_period_id, 'DRAFT', p_generated_by)
    RETURNING id INTO v_schedule_id;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN v_schedule_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_course_id := (v_item->>'course_id')::UUID;

            INSERT INTO student_schedule_items (
                student_schedule_id, student_id, course_id,
                course_assignment_id, item_status
            )
            VALUES (
                       v_schedule_id,
                       p_student_id,
                       v_course_id,
                       NULLIF(v_item->>'course_assignment_id', '')::UUID,
                       'ACTIVE'
                   )
            RETURNING id INTO v_item_id;

            IF v_item ? 'components' THEN
                FOR v_component IN SELECT * FROM jsonb_array_elements(v_item->'components')
                    LOOP
                        v_component_id := (v_component->>'course_component_id')::UUID;
                        v_assign_id := (v_component->>'course_assignment_id')::UUID;

                        INSERT INTO student_schedule_item_components (
                            student_schedule_item_id, course_component_id,
                            course_assignment_id, item_status
                        )
                        VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

                        UPDATE course_schedule_assignments
                        SET enrolled_count = enrolled_count + 1,
                            updated_at     = NOW()
                        WHERE id = v_assign_id;
                    END LOOP;
            ELSE
                v_assign_id := NULLIF(v_item->>'course_assignment_id', '')::UUID;
                IF v_assign_id IS NOT NULL THEN
                    SELECT csa.course_component_id INTO v_component_id
                    FROM   course_schedule_assignments csa
                    WHERE  csa.id = v_assign_id;

                    INSERT INTO student_schedule_item_components (
                        student_schedule_item_id, course_component_id,
                        course_assignment_id, item_status
                    )
                    VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

                    UPDATE course_schedule_assignments
                    SET enrolled_count = enrolled_count + 1,
                        updated_at     = NOW()
                    WHERE id = v_assign_id;
                END IF;
            END IF;
        END LOOP;

    RETURN v_schedule_id;
END;
$$;


--
-- Name: fn_solver_persist_teaching_schedule(uuid, uuid, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_persist_teaching_schedule(p_academic_period_id uuid, p_created_by uuid, p_offers jsonb, p_keep_existing_drafts boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_schedule_id      UUID;
    v_offer            JSONB;
    v_assignment_id    UUID;
    v_classroom_id     UUID;
    v_course_id        UUID;
    v_component_id     UUID;
    v_teacher_id       UUID;
    v_section_number   SMALLINT;
    v_section_id       UUID;
    v_block            JSONB;
    v_slot_id          UUID;
    v_slot_start       TIME;
    v_slot_end         TIME;
BEGIN
    IF NOT COALESCE(p_keep_existing_drafts, FALSE) THEN
        UPDATE teaching_schedules
           SET status = 'CANCELLED', updated_at = NOW()
         WHERE academic_period_id = p_academic_period_id
           AND status = 'DRAFT';
    END IF;

    INSERT INTO teaching_schedules (academic_period_id, status, created_by)
    VALUES (p_academic_period_id, 'DRAFT', p_created_by)
    RETURNING id INTO v_schedule_id;

    IF p_offers IS NULL OR jsonb_array_length(p_offers) = 0 THEN
        RETURN v_schedule_id;
    END IF;

    FOR v_offer IN SELECT * FROM jsonb_array_elements(p_offers)
    LOOP
        v_course_id      := (v_offer->>'course_id')::UUID;
        v_component_id   := (v_offer->>'course_component_id')::UUID;
        v_teacher_id     := (v_offer->>'teacher_id')::UUID;
        v_classroom_id   := (v_offer->>'classroom_id')::UUID;
        v_section_number := COALESCE((v_offer->>'section_number')::SMALLINT, 1);

        INSERT INTO course_sections (teaching_schedule_id, course_id, nrc, section_number)
        VALUES (v_schedule_id, v_course_id, fn_generate_unique_nrc(), v_section_number)
        ON CONFLICT (teaching_schedule_id, course_id, section_number) DO NOTHING;

        SELECT id INTO v_section_id
          FROM course_sections
         WHERE teaching_schedule_id = v_schedule_id
           AND course_id = v_course_id
           AND section_number = v_section_number;

        INSERT INTO course_schedule_assignments (
            teaching_schedule_id, course_id, course_component_id, teacher_id,
            assignment_status, max_capacity, enrolled_count, section_id
        )
        VALUES (
            v_schedule_id, v_course_id, v_component_id, v_teacher_id,
            'DRAFT', COALESCE((v_offer->>'max_capacity')::INTEGER, 0), 0, v_section_id
        )
        RETURNING id INTO v_assignment_id;

        IF v_offer ? 'blocks' THEN
            FOR v_block IN SELECT * FROM jsonb_array_elements(v_offer->'blocks')
            LOOP
                v_slot_id    := (v_block->>'time_slot_id')::UUID;
                v_slot_start := (v_block->>'start_time')::TIME;
                v_slot_end   := (v_block->>'end_time')::TIME;

                INSERT INTO course_assignment_slots (
                    course_assignment_id, teaching_schedule_id, course_id,
                    course_component_id, teacher_id, classroom_id, time_slot_id,
                    slot_start_time, slot_end_time
                )
                VALUES (
                    v_assignment_id, v_schedule_id, v_course_id, v_component_id,
                    v_teacher_id, v_classroom_id, v_slot_id, v_slot_start, v_slot_end
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        ELSE
            INSERT INTO course_assignment_slots (
                course_assignment_id, teaching_schedule_id, course_id,
                course_component_id, teacher_id, classroom_id, time_slot_id,
                slot_start_time, slot_end_time
            )
            SELECT v_assignment_id,
                   v_schedule_id,
                   v_course_id,
                   v_component_id,
                   v_teacher_id,
                   v_classroom_id,
                   (slot_id_text)::UUID,
                   ts.start_time,
                   ts.end_time
              FROM jsonb_array_elements_text(v_offer->'time_slot_ids') AS slot_id_text
              JOIN time_slots ts ON ts.id = (slot_id_text)::UUID
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;


--
-- Name: fn_solver_reserve_generation_request(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_reserve_generation_request(p_actor_id uuid, p_academic_period_id uuid) RETURNS TABLE(reservation_id uuid, accepted boolean, retry_after_seconds integer, remaining integer)
    LANGUAGE plpgsql
    AS $$ DECLARE v_limit INTEGER := 5; v_window INTERVAL := INTERVAL '5 minutes'; v_recent_count INTEGER; v_oldest TIMESTAMPTZ; v_id UUID; BEGIN IF p_actor_id IS NULL THEN RAISE EXCEPTION 'actor_id es obligatorio' USING ERRCODE = 'P0001'; END IF; UPDATE solver_generation_reservations SET status = 'EXPIRED', updated_at = NOW() WHERE actor_id = p_actor_id AND status = 'ACCEPTED' AND expires_at < NOW(); SELECT COUNT(*)::INTEGER, MIN(created_at) INTO v_recent_count, v_oldest FROM solver_generation_reservations WHERE actor_id = p_actor_id AND status IN ('ACCEPTED', 'CONSUMED') AND created_at > NOW() - v_window; IF v_recent_count >= v_limit THEN RETURN QUERY SELECT NULL::UUID, FALSE, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_oldest + v_window - NOW())))::INTEGER), 0; RETURN; END IF; INSERT INTO solver_generation_reservations (actor_id, academic_period_id, status, expires_at) VALUES (p_actor_id, p_academic_period_id, 'ACCEPTED', NOW() + v_window) RETURNING id INTO v_id; RETURN QUERY SELECT v_id, TRUE, 0, GREATEST(0, v_limit - v_recent_count - 1); END; $$;


--
-- Name: fn_solver_set_run_input_hash(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_solver_set_run_input_hash(p_run_id uuid, p_hash character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE solver_runs
    SET input_hash = p_hash,
        updated_at = NOW()
    WHERE id = p_run_id;
END;
$$;


--
-- Name: fn_sync_student_from_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_student_from_profile() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo actualiza si existe un student vinculado al mismo user_id
    UPDATE students
    SET    facultad_id = NEW.facultad_id,
           carrera_id  = NEW.carrera_id
    WHERE  user_id = NEW.user_id;

    RETURN NEW;
END;
$$;


--
-- Name: fn_update_academic_period(uuid, character varying, character varying, date, date, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_academic_period(p_period_id uuid, p_code character varying, p_name character varying, p_starts_at date, p_ends_at date, p_status character varying, p_max_student_credits integer) RETURNS public.academic_periods
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_period academic_periods;
BEGIN
    UPDATE academic_periods
    SET    code                = TRIM(p_code),
           name                = TRIM(p_name),
           starts_at           = p_starts_at,
           ends_at             = p_ends_at,
           status              = UPPER(TRIM(p_status)),
           max_student_credits = COALESCE(p_max_student_credits, 22)
    WHERE  id = p_period_id
    RETURNING * INTO v_period;

    RETURN v_period;
END;
$$;


--
-- Name: fn_update_academic_period(uuid, character varying, character varying, date, date, character varying, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_academic_period(p_period_id uuid, p_code character varying, p_name character varying, p_starts_at date, p_ends_at date, p_status character varying, p_max_student_credits integer, p_is_active boolean) RETURNS public.academic_periods
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_period academic_periods;
BEGIN
    UPDATE academic_periods
    SET    code                = TRIM(p_code),
           name                = TRIM(p_name),
           starts_at           = p_starts_at,
           ends_at             = p_ends_at,
           status              = UPPER(TRIM(p_status)),
           max_student_credits = COALESCE(p_max_student_credits, 22),
           is_active           = COALESCE(p_is_active, is_active)
    WHERE  id = p_period_id
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;


--
-- Name: fn_update_carrera(uuid, uuid, character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_carrera(p_id uuid, p_facultad_id uuid, p_code character varying, p_name character varying, p_is_active boolean) RETURNS public.carreras
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_row carreras%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facultades WHERE id = p_facultad_id) THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_facultad_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE carreras
    SET facultad_id = p_facultad_id,
        code        = NULLIF(TRIM(p_code), ''),
        name        = TRIM(p_name),
        is_active   = COALESCE(p_is_active, is_active)
    WHERE id = p_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;


--
-- Name: fn_update_classroom(uuid, character varying, character varying, integer, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_classroom(p_classroom_id uuid, p_code character varying, p_name character varying, p_capacity integer, p_room_type character varying, p_is_active boolean) RETURNS public.classrooms
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    UPDATE classrooms
    SET    code      = TRIM(p_code),
           name      = TRIM(p_name),
           capacity  = p_capacity,
           room_type = TRIM(p_room_type),
           is_active = COALESCE(p_is_active, TRUE)
    WHERE  id = p_classroom_id
    RETURNING * INTO v_classroom;
    RETURN v_classroom;
END;
$$;


--
-- Name: fn_update_course(uuid, character varying, character varying, integer, integer, integer, numeric, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_course(p_course_id uuid, p_code character varying, p_name character varying, p_cycle integer, p_credits integer, p_required_credits integer, p_weekly_hours numeric, p_required_room_type character varying, p_is_active boolean) RETURNS public.courses
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course courses;
    v_room_type VARCHAR(100);
BEGIN
    v_room_type := NULLIF(TRIM(p_required_room_type), '');

    IF v_room_type IS NULL THEN
        RAISE EXCEPTION 'El tipo de aula requerido es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE courses
    SET    code               = TRIM(p_code),
           name               = TRIM(p_name),
           cycle              = COALESCE(p_cycle, 1),
           credits            = p_credits,
           required_credits   = COALESCE(p_required_credits, 0),
           weekly_hours       = p_weekly_hours,
           required_room_type = v_room_type,
           is_active          = COALESCE(p_is_active, TRUE)
    WHERE  id = p_course_id
    RETURNING * INTO v_course;

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    SELECT v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active
    WHERE  v_course.id IS NOT NULL
      AND  NOT EXISTS (
        SELECT 1 FROM course_components cc WHERE cc.course_id = v_course.id
    );

    RETURN v_course;
END;
$$;


--
-- Name: fn_update_facultad(uuid, character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_facultad(p_id uuid, p_code character varying, p_name character varying, p_is_active boolean) RETURNS public.facultades
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    UPDATE facultades
    SET code       = TRIM(p_code),
        name       = TRIM(p_name),
        is_active  = COALESCE(p_is_active, is_active)
    WHERE id = p_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;


--
-- Name: fn_update_student(uuid, uuid, character varying, character varying, integer, character varying, integer, boolean, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_student(p_student_id uuid, p_user_id uuid, p_code character varying, p_full_name character varying, p_cycle integer, p_career character varying, p_credit_limit integer, p_is_active boolean, p_facultad_id uuid DEFAULT NULL::uuid, p_carrera_id uuid DEFAULT NULL::uuid) RETURNS public.students
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_student students;
BEGIN
    UPDATE students
    SET    user_id      = p_user_id,
           code         = TRIM(p_code),
           full_name    = TRIM(p_full_name),
           cycle        = p_cycle,
           career       = NULLIF(TRIM(COALESCE(p_career, '')), ''),
           credit_limit = COALESCE(p_credit_limit, 22),
           is_active    = COALESCE(p_is_active, TRUE),
           facultad_id  = p_facultad_id,
           carrera_id   = p_carrera_id
    WHERE  id = p_student_id
    RETURNING * INTO v_student;

    RETURN v_student;
END;
$$;


--
-- Name: fn_update_teacher(uuid, uuid, character varying, character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_teacher(p_teacher_id uuid, p_user_id uuid, p_code character varying, p_full_name character varying, p_specialty character varying, p_is_active boolean) RETURNS public.teachers
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_teacher teachers;
BEGIN
    UPDATE teachers
    SET    user_id   = p_user_id,
           code      = TRIM(p_code),
           full_name = TRIM(p_full_name),
           specialty = TRIM(p_specialty),
           is_active = COALESCE(p_is_active, TRUE)
    WHERE  id = p_teacher_id
    RETURNING * INTO v_teacher;
    RETURN v_teacher;
END;
$$;


--
-- Name: fn_upsert_profile(uuid, character varying, character varying, public.sex_type, smallint, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_upsert_profile(p_user_id uuid, p_dni character varying, p_phone character varying, p_sex public.sex_type, p_age smallint, p_facultad_id uuid DEFAULT NULL::uuid, p_carrera_id uuid DEFAULT NULL::uuid) RETURNS public.profiles
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_profile profiles;
BEGIN
    INSERT INTO profiles (user_id, dni, phone, sex, age, facultad_id, carrera_id)
    VALUES (p_user_id, p_dni, p_phone, p_sex, p_age, p_facultad_id, p_carrera_id)
    ON CONFLICT (user_id) DO UPDATE
        SET dni         = EXCLUDED.dni,
            phone       = EXCLUDED.phone,
            sex         = EXCLUDED.sex,
            age         = EXCLUDED.age,
            facultad_id = EXCLUDED.facultad_id,
            carrera_id  = EXCLUDED.carrera_id
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$;


--
-- Name: building_travel_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_travel_times (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    building_a character varying(20) NOT NULL,
    building_b character varying(20) NOT NULL,
    minutes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT building_travel_times_minutes_check CHECK ((minutes >= 0)),
    CONSTRAINT chk_building_travel_distinct CHECK (((building_a)::text <> (building_b)::text))
);


--
-- Name: classroom_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classroom_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    time_slot_id uuid NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: classroom_course_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classroom_course_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    course_component_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: classroom_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classroom_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    course_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_assignment_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_assignment_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_assignment_id uuid NOT NULL,
    teaching_schedule_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    time_slot_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid NOT NULL,
    course_component_id uuid NOT NULL,
    slot_start_time time without time zone NOT NULL,
    slot_end_time time without time zone NOT NULL,
    CONSTRAINT chk_course_assignment_slot_block_duration CHECK ((slot_end_time = (slot_start_time + '01:30:00'::interval))),
    CONSTRAINT chk_course_assignment_slot_block_range CHECK ((slot_end_time > slot_start_time))
);


--
-- Name: course_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    component_type character varying(20) NOT NULL,
    weekly_hours numeric(3,1) NOT NULL,
    required_room_type character varying(100) NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_components_type CHECK (((component_type)::text = ANY (ARRAY[('GENERAL'::character varying)::text, ('THEORY'::character varying)::text, ('PRACTICE'::character varying)::text]))),
    CONSTRAINT course_components_required_room_type_check CHECK ((btrim((required_room_type)::text) <> ''::text)),
    CONSTRAINT course_components_sort_order_check CHECK ((sort_order >= 1)),
    CONSTRAINT course_components_weekly_hours_check CHECK ((weekly_hours > (0)::numeric))
);


--
-- Name: course_corequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_corequisites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    corequisite_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_corequisites_self CHECK ((course_id <> corequisite_id))
);


--
-- Name: course_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_prerequisites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    prerequisite_course_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_prerequisites_self CHECK ((course_id <> prerequisite_course_id))
);


--
-- Name: course_schedule_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_schedule_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teaching_schedule_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    assignment_status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid NOT NULL,
    enrolled_count integer DEFAULT 0 NOT NULL,
    max_capacity integer DEFAULT 0 NOT NULL,
    course_component_id uuid NOT NULL,
    section_id uuid,
    CONSTRAINT chk_course_schedule_assignments_status CHECK (((assignment_status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('CONFIRMED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT chk_csa_enrolled_count_nonneg CHECK ((enrolled_count >= 0)),
    CONSTRAINT chk_csa_enrolled_le_max CHECK ((enrolled_count <= max_capacity)),
    CONSTRAINT chk_csa_max_capacity_nonneg CHECK ((max_capacity >= 0))
);


--
-- Name: course_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teaching_schedule_id uuid NOT NULL,
    course_id uuid NOT NULL,
    nrc character(5) NOT NULL,
    section_number smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_sections_number CHECK (((section_number >= 1) AND (section_number <= 3)))
);


--
-- Name: ml_feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_feature_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_type character varying(50) NOT NULL,
    related_entity_type character varying(50) NOT NULL,
    related_entity_id uuid NOT NULL,
    features_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ml_model_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_model_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name character varying(100) NOT NULL,
    model_type character varying(50) NOT NULL,
    target_name character varying(100) NOT NULL,
    library_name character varying(50) NOT NULL,
    library_version character varying(50) NOT NULL,
    artifact_path text NOT NULL,
    feature_schema_json jsonb NOT NULL,
    metrics_json jsonb,
    status character varying(20) DEFAULT 'TRAINED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    CONSTRAINT chk_ml_model_registry_status CHECK (((status)::text = ANY (ARRAY[('TRAINED'::character varying)::text, ('ACTIVE'::character varying)::text, ('ARCHIVED'::character varying)::text])))
);


--
-- Name: ml_prediction_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_prediction_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_id uuid NOT NULL,
    solver_run_id uuid,
    prediction_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    score numeric(12,6) NOT NULL,
    explanation_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ml_training_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_training_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name character varying(100) NOT NULL,
    dataset_version character varying(100) NOT NULL,
    target_name character varying(100) NOT NULL,
    library_name character varying(50) NOT NULL,
    library_version character varying(50) NOT NULL,
    metrics_json jsonb,
    artifact_path text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ml_training_runs_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('RUNNING'::character varying)::text, ('SUCCEEDED'::character varying)::text, ('FAILED'::character varying)::text])))
);


--
-- Name: oauth2_linked_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth2_linked_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_subject character varying(255) NOT NULL,
    provider_email character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    otp_hash character varying(255) NOT NULL,
    reset_token_hash character varying(64),
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    used boolean DEFAULT false NOT NULL,
    used_at timestamp with time zone,
    verify_attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedule_feedback_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_feedback_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(50) NOT NULL,
    academic_period_id uuid NOT NULL,
    student_id uuid,
    teaching_schedule_id uuid,
    student_schedule_id uuid,
    assignment_id uuid,
    actor_user_id uuid,
    event_payload_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid
);


--
-- Name: solver_course_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solver_course_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    scheduling_kind character varying(30) DEFAULT 'REGULAR'::character varying NOT NULL,
    elective_group_code character varying(50),
    max_sections integer DEFAULT 3 NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    placement_strategy character varying(30) DEFAULT 'NORMAL'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_solver_course_rules_kind CHECK (((scheduling_kind)::text = ANY ((ARRAY['REGULAR'::character varying, 'ELECTIVE'::character varying])::text[]))),
    CONSTRAINT chk_solver_course_rules_strategy CHECK (((placement_strategy)::text = ANY ((ARRAY['NORMAL'::character varying, 'FILL_REMAINING'::character varying])::text[]))),
    CONSTRAINT solver_course_rules_max_sections_check CHECK (((max_sections >= 1) AND (max_sections <= 10))),
    CONSTRAINT solver_course_rules_priority_check CHECK ((priority >= 0))
);


--
-- Name: solver_generation_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solver_generation_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    academic_period_id uuid NOT NULL,
    status character varying(20) DEFAULT 'ACCEPTED'::character varying NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_solver_generation_reservations_status CHECK (((status)::text = ANY ((ARRAY['ACCEPTED'::character varying, 'CONSUMED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: solver_run_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solver_run_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    solver_run_id uuid NOT NULL,
    conflict_type character varying(50) NOT NULL,
    resource_type character varying(50),
    resource_id uuid,
    time_slot_id uuid,
    message text NOT NULL,
    details_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid
);


--
-- Name: solver_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solver_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_type character varying(20) NOT NULL,
    academic_period_id uuid NOT NULL,
    student_id uuid,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    requested_by uuid,
    time_limit_ms integer DEFAULT 30000 NOT NULL,
    input_hash character varying(128),
    result_summary text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    teaching_schedule_id uuid,
    seed integer,
    CONSTRAINT chk_solver_runs_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('RUNNING'::character varying)::text, ('SUCCEEDED'::character varying)::text, ('FAILED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT chk_solver_runs_type CHECK (((run_type)::text = ANY (ARRAY[('TEACHER'::character varying)::text, ('STUDENT'::character varying)::text]))),
    CONSTRAINT solver_runs_time_limit_ms_check CHECK ((time_limit_ms > 0))
);


--
-- Name: student_completed_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_completed_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_schedule_item_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_schedule_item_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_schedule_item_id uuid NOT NULL,
    course_component_id uuid NOT NULL,
    course_assignment_id uuid NOT NULL,
    item_status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ssic_status CHECK (((item_status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('REMOVED'::character varying)::text])))
);


--
-- Name: student_schedule_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_schedule_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_schedule_id uuid NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    item_status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_assignment_id uuid,
    CONSTRAINT chk_student_schedule_items_status CHECK (((item_status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('REMOVED'::character varying)::text])))
);


--
-- Name: student_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    academic_period_id uuid NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    CONSTRAINT chk_student_schedules_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('CONFIRMED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


--
-- Name: teacher_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    time_slot_id uuid NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_course_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_course_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    course_component_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    course_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teaching_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    academic_period_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_by uuid,
    confirmed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    option_label character varying(50),
    CONSTRAINT chk_teaching_schedules_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('CONFIRMED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
    CONSTRAINT teaching_schedules_version_check CHECK ((version > 0))
);


--
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week public.day_of_week NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_time_slots_range CHECK ((end_time > start_time))
);


--
-- Name: academic_periods academic_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_periods
    ADD CONSTRAINT academic_periods_pkey PRIMARY KEY (id);


--
-- Name: building_travel_times building_travel_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_travel_times
    ADD CONSTRAINT building_travel_times_pkey PRIMARY KEY (id);


--
-- Name: carreras carreras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_pkey PRIMARY KEY (id);


--
-- Name: classroom_availability classroom_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_availability
    ADD CONSTRAINT classroom_availability_pkey PRIMARY KEY (id);


--
-- Name: classroom_course_components classroom_course_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_course_components
    ADD CONSTRAINT classroom_course_components_pkey PRIMARY KEY (id);


--
-- Name: classroom_courses classroom_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_courses
    ADD CONSTRAINT classroom_courses_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: course_assignment_slots course_assignment_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT course_assignment_slots_pkey PRIMARY KEY (id);


--
-- Name: course_components course_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_components
    ADD CONSTRAINT course_components_pkey PRIMARY KEY (id);


--
-- Name: course_corequisites course_corequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_corequisites
    ADD CONSTRAINT course_corequisites_pkey PRIMARY KEY (id);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (id);


--
-- Name: course_schedule_assignments course_schedule_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT course_schedule_assignments_pkey PRIMARY KEY (id);


--
-- Name: course_sections course_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT course_sections_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: facultades facultades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facultades
    ADD CONSTRAINT facultades_pkey PRIMARY KEY (id);


--
-- Name: ml_feature_snapshots ml_feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_feature_snapshots
    ADD CONSTRAINT ml_feature_snapshots_pkey PRIMARY KEY (id);


--
-- Name: ml_model_registry ml_model_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_model_registry
    ADD CONSTRAINT ml_model_registry_pkey PRIMARY KEY (id);


--
-- Name: ml_prediction_logs ml_prediction_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_prediction_logs
    ADD CONSTRAINT ml_prediction_logs_pkey PRIMARY KEY (id);


--
-- Name: ml_training_runs ml_training_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_training_runs
    ADD CONSTRAINT ml_training_runs_pkey PRIMARY KEY (id);


--
-- Name: oauth2_linked_accounts oauth2_linked_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth2_linked_accounts
    ADD CONSTRAINT oauth2_linked_accounts_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: schedule_feedback_events schedule_feedback_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT schedule_feedback_events_pkey PRIMARY KEY (id);


--
-- Name: solver_course_rules solver_course_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_course_rules
    ADD CONSTRAINT solver_course_rules_pkey PRIMARY KEY (id);


--
-- Name: solver_generation_reservations solver_generation_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_generation_reservations
    ADD CONSTRAINT solver_generation_reservations_pkey PRIMARY KEY (id);


--
-- Name: solver_run_conflicts solver_run_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT solver_run_conflicts_pkey PRIMARY KEY (id);


--
-- Name: solver_runs solver_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_runs
    ADD CONSTRAINT solver_runs_pkey PRIMARY KEY (id);


--
-- Name: student_completed_courses student_completed_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_completed_courses
    ADD CONSTRAINT student_completed_courses_pkey PRIMARY KEY (id);


--
-- Name: student_schedule_item_components student_schedule_item_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_item_components
    ADD CONSTRAINT student_schedule_item_components_pkey PRIMARY KEY (id);


--
-- Name: student_schedule_items student_schedule_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT student_schedule_items_pkey PRIMARY KEY (id);


--
-- Name: student_schedules student_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedules
    ADD CONSTRAINT student_schedules_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: teacher_availability teacher_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT teacher_availability_pkey PRIMARY KEY (id);


--
-- Name: teacher_course_components teacher_course_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_course_components
    ADD CONSTRAINT teacher_course_components_pkey PRIMARY KEY (id);


--
-- Name: teacher_courses teacher_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT teacher_courses_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: teaching_schedules teaching_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_schedules
    ADD CONSTRAINT teaching_schedules_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- Name: academic_periods uq_academic_periods_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_periods
    ADD CONSTRAINT uq_academic_periods_code UNIQUE (code);


--
-- Name: building_travel_times uq_building_travel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_travel_times
    ADD CONSTRAINT uq_building_travel UNIQUE (building_a, building_b);


--
-- Name: carreras uq_carreras_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT uq_carreras_code UNIQUE (code);


--
-- Name: classroom_availability uq_classroom_availability; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_availability
    ADD CONSTRAINT uq_classroom_availability UNIQUE (classroom_id, time_slot_id);


--
-- Name: classroom_course_components uq_classroom_course_components; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_course_components
    ADD CONSTRAINT uq_classroom_course_components UNIQUE (classroom_id, course_component_id);


--
-- Name: classroom_courses uq_classroom_courses; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_courses
    ADD CONSTRAINT uq_classroom_courses UNIQUE (classroom_id, course_id);


--
-- Name: classrooms uq_classrooms_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT uq_classrooms_code UNIQUE (code);


--
-- Name: course_assignment_slots uq_course_assignment_slots_assignment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT uq_course_assignment_slots_assignment UNIQUE (course_assignment_id, time_slot_id, slot_start_time, slot_end_time);


--
-- Name: course_components uq_course_components_sort; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_components
    ADD CONSTRAINT uq_course_components_sort UNIQUE (course_id, sort_order);


--
-- Name: course_components uq_course_components_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_components
    ADD CONSTRAINT uq_course_components_type UNIQUE (course_id, component_type);


--
-- Name: course_corequisites uq_course_corequisites; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_corequisites
    ADD CONSTRAINT uq_course_corequisites UNIQUE (course_id, corequisite_id);


--
-- Name: course_prerequisites uq_course_prerequisites; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT uq_course_prerequisites UNIQUE (course_id, prerequisite_course_id);


--
-- Name: course_sections uq_course_sections_nrc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT uq_course_sections_nrc UNIQUE (nrc);


--
-- Name: course_sections uq_course_sections_per_schedule; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT uq_course_sections_per_schedule UNIQUE (teaching_schedule_id, course_id, section_number);


--
-- Name: courses uq_courses_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT uq_courses_code UNIQUE (code);


--
-- Name: facultades uq_facultades_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facultades
    ADD CONSTRAINT uq_facultades_code UNIQUE (code);


--
-- Name: oauth2_linked_accounts uq_oauth2_provider_subject; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth2_linked_accounts
    ADD CONSTRAINT uq_oauth2_provider_subject UNIQUE (provider, provider_subject);


--
-- Name: profiles uq_profiles_dni; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT uq_profiles_dni UNIQUE (dni);


--
-- Name: profiles uq_profiles_phone; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT uq_profiles_phone UNIQUE (phone);


--
-- Name: profiles uq_profiles_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT uq_profiles_user_id UNIQUE (user_id);


--
-- Name: refresh_tokens uq_refresh_token_hash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash);


--
-- Name: solver_course_rules uq_solver_course_rules_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_course_rules
    ADD CONSTRAINT uq_solver_course_rules_course UNIQUE (course_id);


--
-- Name: student_schedule_item_components uq_ssic_item_component; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_item_components
    ADD CONSTRAINT uq_ssic_item_component UNIQUE (student_schedule_item_id, course_component_id);


--
-- Name: student_completed_courses uq_student_completed_courses; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_completed_courses
    ADD CONSTRAINT uq_student_completed_courses UNIQUE (student_id, course_id);


--
-- Name: student_schedule_items uq_student_schedule_items_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT uq_student_schedule_items_course UNIQUE (student_schedule_id, course_id);


--
-- Name: students uq_students_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT uq_students_code UNIQUE (code);


--
-- Name: students uq_students_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT uq_students_user_id UNIQUE (user_id);


--
-- Name: teacher_availability uq_teacher_availability; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT uq_teacher_availability UNIQUE (teacher_id, time_slot_id);


--
-- Name: teacher_course_components uq_teacher_course_components; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_course_components
    ADD CONSTRAINT uq_teacher_course_components UNIQUE (teacher_id, course_component_id);


--
-- Name: teacher_courses uq_teacher_courses; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT uq_teacher_courses UNIQUE (teacher_id, course_id);


--
-- Name: teachers uq_teachers_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT uq_teachers_code UNIQUE (code);


--
-- Name: teachers uq_teachers_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT uq_teachers_user_id UNIQUE (user_id);


--
-- Name: time_slots uq_time_slots_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT uq_time_slots_value UNIQUE (day_of_week, start_time, end_time);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_building_travel_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_travel_a ON public.building_travel_times USING btree (building_a);


--
-- Name: idx_building_travel_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_travel_b ON public.building_travel_times USING btree (building_b);


--
-- Name: idx_carreras_facultad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carreras_facultad_id ON public.carreras USING btree (facultad_id);


--
-- Name: idx_classroom_availability_classroom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_availability_classroom_id ON public.classroom_availability USING btree (classroom_id);


--
-- Name: idx_classroom_availability_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_availability_slot_id ON public.classroom_availability USING btree (time_slot_id);


--
-- Name: idx_classroom_course_components_classroom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_course_components_classroom_id ON public.classroom_course_components USING btree (classroom_id);


--
-- Name: idx_classroom_course_components_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_course_components_component_id ON public.classroom_course_components USING btree (course_component_id);


--
-- Name: idx_classroom_courses_classroom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_courses_classroom_id ON public.classroom_courses USING btree (classroom_id);


--
-- Name: idx_classroom_courses_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_courses_course_id ON public.classroom_courses USING btree (course_id);


--
-- Name: idx_classrooms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classrooms_active ON public.classrooms USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_classrooms_building_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classrooms_building_code ON public.classrooms USING btree (building_code);


--
-- Name: idx_course_assignment_slots_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_assignment_slots_component_id ON public.course_assignment_slots USING btree (course_component_id);


--
-- Name: idx_course_assignment_slots_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_assignment_slots_course_id ON public.course_assignment_slots USING btree (course_id);


--
-- Name: idx_course_assignment_slots_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_assignment_slots_schedule_id ON public.course_assignment_slots USING btree (teaching_schedule_id);


--
-- Name: idx_course_assignment_slots_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_assignment_slots_slot_id ON public.course_assignment_slots USING btree (time_slot_id);


--
-- Name: idx_course_components_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_components_active ON public.course_components USING btree (course_id, sort_order) WHERE (is_active = true);


--
-- Name: idx_course_components_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_components_course_id ON public.course_components USING btree (course_id);


--
-- Name: idx_course_corequisites_coreq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_corequisites_coreq ON public.course_corequisites USING btree (corequisite_id);


--
-- Name: idx_course_corequisites_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_corequisites_course ON public.course_corequisites USING btree (course_id);


--
-- Name: idx_course_prerequisites_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_prerequisites_course_id ON public.course_prerequisites USING btree (course_id);


--
-- Name: idx_course_prerequisites_required_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_prerequisites_required_id ON public.course_prerequisites USING btree (prerequisite_course_id);


--
-- Name: idx_course_schedule_assignments_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_schedule_assignments_component_id ON public.course_schedule_assignments USING btree (course_component_id);


--
-- Name: idx_course_schedule_assignments_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_schedule_assignments_course_id ON public.course_schedule_assignments USING btree (course_id);


--
-- Name: idx_course_schedule_assignments_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_schedule_assignments_schedule_id ON public.course_schedule_assignments USING btree (teaching_schedule_id);


--
-- Name: idx_course_schedule_assignments_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_schedule_assignments_teacher_id ON public.course_schedule_assignments USING btree (teacher_id);


--
-- Name: idx_course_sections_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_sections_course_id ON public.course_sections USING btree (course_id);


--
-- Name: idx_course_sections_nrc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_sections_nrc ON public.course_sections USING btree (nrc);


--
-- Name: idx_course_sections_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_sections_schedule_id ON public.course_sections USING btree (teaching_schedule_id);


--
-- Name: idx_courses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_active ON public.courses USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_csa_schedule_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csa_schedule_course ON public.course_schedule_assignments USING btree (teaching_schedule_id, course_id);


--
-- Name: idx_csa_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csa_section_id ON public.course_schedule_assignments USING btree (section_id);


--
-- Name: idx_ml_model_registry_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_model_registry_status ON public.ml_model_registry USING btree (status);


--
-- Name: idx_ml_prediction_logs_model_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_prediction_logs_model_id ON public.ml_prediction_logs USING btree (model_id);


--
-- Name: idx_ml_prediction_logs_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_prediction_logs_run_id ON public.ml_prediction_logs USING btree (solver_run_id) WHERE (solver_run_id IS NOT NULL);


--
-- Name: idx_oauth2_provider_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth2_provider_subject ON public.oauth2_linked_accounts USING btree (provider, provider_subject);


--
-- Name: idx_oauth2_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth2_user_id ON public.oauth2_linked_accounts USING btree (user_id);


--
-- Name: idx_profiles_carrera_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_carrera_id ON public.profiles USING btree (carrera_id);


--
-- Name: idx_profiles_facultad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_facultad_id ON public.profiles USING btree (facultad_id);


--
-- Name: idx_prt_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_active ON public.password_reset_tokens USING btree (user_id, expires_at) WHERE (used = false);


--
-- Name: idx_prt_reset_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_reset_token_hash ON public.password_reset_tokens USING btree (reset_token_hash) WHERE (reset_token_hash IS NOT NULL);


--
-- Name: idx_prt_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_refresh_tokens_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_active ON public.refresh_tokens USING btree (expires_at) WHERE (revoked = false);


--
-- Name: idx_refresh_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_schedule_feedback_events_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_feedback_events_period_id ON public.schedule_feedback_events USING btree (academic_period_id);


--
-- Name: idx_solver_course_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_course_rules_active ON public.solver_course_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_solver_course_rules_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_course_rules_course_id ON public.solver_course_rules USING btree (course_id);


--
-- Name: idx_solver_generation_reservations_actor_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_generation_reservations_actor_window ON public.solver_generation_reservations USING btree (actor_id, created_at DESC) WHERE ((status)::text = ANY ((ARRAY['ACCEPTED'::character varying, 'CONSUMED'::character varying])::text[]));


--
-- Name: idx_solver_generation_reservations_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_generation_reservations_period ON public.solver_generation_reservations USING btree (academic_period_id);


--
-- Name: idx_solver_run_conflicts_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_run_conflicts_run_id ON public.solver_run_conflicts USING btree (solver_run_id);


--
-- Name: idx_solver_runs_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_runs_period_id ON public.solver_runs USING btree (academic_period_id);


--
-- Name: idx_solver_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_runs_status ON public.solver_runs USING btree (status);


--
-- Name: idx_solver_runs_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_runs_student_id ON public.solver_runs USING btree (student_id) WHERE (student_id IS NOT NULL);


--
-- Name: idx_solver_runs_teaching_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solver_runs_teaching_schedule_id ON public.solver_runs USING btree (teaching_schedule_id) WHERE (teaching_schedule_id IS NOT NULL);


--
-- Name: idx_ssi_course_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ssi_course_assignment ON public.student_schedule_items USING btree (course_assignment_id);


--
-- Name: idx_ssic_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ssic_assignment_id ON public.student_schedule_item_components USING btree (course_assignment_id);


--
-- Name: idx_ssic_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ssic_component_id ON public.student_schedule_item_components USING btree (course_component_id);


--
-- Name: idx_ssic_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ssic_item_id ON public.student_schedule_item_components USING btree (student_schedule_item_id);


--
-- Name: idx_student_completed_courses_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_completed_courses_course_id ON public.student_completed_courses USING btree (course_id);


--
-- Name: idx_student_completed_courses_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_completed_courses_student_id ON public.student_completed_courses USING btree (student_id);


--
-- Name: idx_student_schedule_items_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedule_items_course_id ON public.student_schedule_items USING btree (course_id);


--
-- Name: idx_student_schedule_items_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedule_items_schedule_id ON public.student_schedule_items USING btree (student_schedule_id);


--
-- Name: idx_student_schedule_items_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedule_items_student_id ON public.student_schedule_items USING btree (student_id);


--
-- Name: idx_student_schedules_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedules_period_id ON public.student_schedules USING btree (academic_period_id);


--
-- Name: idx_student_schedules_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedules_student_id ON public.student_schedules USING btree (student_id);


--
-- Name: idx_students_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_active ON public.students USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_students_carrera_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_carrera_id ON public.students USING btree (carrera_id);


--
-- Name: idx_students_facultad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_facultad_id ON public.students USING btree (facultad_id);


--
-- Name: idx_students_gpa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_gpa ON public.students USING btree (gpa DESC NULLS LAST) WHERE (is_active = true);


--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_user_id ON public.students USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_teacher_availability_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_availability_slot_id ON public.teacher_availability USING btree (time_slot_id);


--
-- Name: idx_teacher_availability_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_availability_teacher_id ON public.teacher_availability USING btree (teacher_id);


--
-- Name: idx_teacher_course_components_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_course_components_component_id ON public.teacher_course_components USING btree (course_component_id);


--
-- Name: idx_teacher_course_components_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_course_components_teacher_id ON public.teacher_course_components USING btree (teacher_id);


--
-- Name: idx_teacher_courses_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_courses_course_id ON public.teacher_courses USING btree (course_id);


--
-- Name: idx_teacher_courses_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_courses_teacher_id ON public.teacher_courses USING btree (teacher_id);


--
-- Name: idx_teachers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teachers_active ON public.teachers USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_teachers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teachers_user_id ON public.teachers USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_teaching_schedules_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_schedules_period_id ON public.teaching_schedules USING btree (academic_period_id);


--
-- Name: idx_time_slots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_slots_active ON public.time_slots USING btree (day_of_week, start_time) WHERE (is_active = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: uq_student_schedules_active_per_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_student_schedules_active_per_period ON public.student_schedules USING btree (student_id, academic_period_id) WHERE ((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('CONFIRMED'::character varying)::text]));


--
-- Name: uq_teaching_schedules_confirmed_per_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_teaching_schedules_confirmed_per_period ON public.teaching_schedules USING btree (academic_period_id) WHERE ((status)::text = 'CONFIRMED'::text);


--
-- Name: academic_periods trg_academic_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_academic_periods_updated_at BEFORE UPDATE ON public.academic_periods FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: carreras trg_carreras_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_carreras_updated_at BEFORE UPDATE ON public.carreras FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: classroom_availability trg_classroom_availability_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_classroom_availability_updated_at BEFORE UPDATE ON public.classroom_availability FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: classroom_courses trg_classroom_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_classroom_courses_updated_at BEFORE UPDATE ON public.classroom_courses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: classrooms trg_classrooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_classrooms_updated_at BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_assignment_slots trg_course_assignment_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_assignment_slots_updated_at BEFORE UPDATE ON public.course_assignment_slots FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_prerequisites trg_course_prerequisites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_prerequisites_updated_at BEFORE UPDATE ON public.course_prerequisites FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_schedule_assignments trg_course_schedule_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_schedule_assignments_updated_at BEFORE UPDATE ON public.course_schedule_assignments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: courses trg_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: facultades trg_facultades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_facultades_updated_at BEFORE UPDATE ON public.facultades FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: ml_feature_snapshots trg_ml_feature_snapshots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ml_feature_snapshots_updated_at BEFORE UPDATE ON public.ml_feature_snapshots FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: ml_model_registry trg_ml_model_registry_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ml_model_registry_updated_at BEFORE UPDATE ON public.ml_model_registry FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: ml_prediction_logs trg_ml_prediction_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ml_prediction_logs_updated_at BEFORE UPDATE ON public.ml_prediction_logs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: ml_training_runs trg_ml_training_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ml_training_runs_updated_at BEFORE UPDATE ON public.ml_training_runs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: building_travel_times trg_notify_solver_building_travel_times; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_building_travel_times AFTER INSERT OR DELETE OR UPDATE ON public.building_travel_times FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: classroom_availability trg_notify_solver_classroom_availability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_classroom_availability AFTER INSERT OR DELETE OR UPDATE ON public.classroom_availability FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: classroom_courses trg_notify_solver_classroom_courses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_classroom_courses AFTER INSERT OR DELETE OR UPDATE ON public.classroom_courses FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: classrooms trg_notify_solver_classrooms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_classrooms AFTER INSERT OR DELETE OR UPDATE ON public.classrooms FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: course_assignment_slots trg_notify_solver_course_assignment_slots; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_course_assignment_slots AFTER INSERT OR DELETE OR UPDATE ON public.course_assignment_slots FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: course_corequisites trg_notify_solver_course_corequisites; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_course_corequisites AFTER INSERT OR DELETE OR UPDATE ON public.course_corequisites FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: course_prerequisites trg_notify_solver_course_prerequisites; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_course_prerequisites AFTER INSERT OR DELETE OR UPDATE ON public.course_prerequisites FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: course_schedule_assignments trg_notify_solver_course_schedule_assignments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_course_schedule_assignments AFTER INSERT OR DELETE OR UPDATE ON public.course_schedule_assignments FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: courses trg_notify_solver_courses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_courses AFTER INSERT OR DELETE OR UPDATE ON public.courses FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: students trg_notify_solver_students; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_students AFTER INSERT OR DELETE OR UPDATE ON public.students FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: teacher_availability trg_notify_solver_teacher_availability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_teacher_availability AFTER INSERT OR DELETE OR UPDATE ON public.teacher_availability FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: teacher_courses trg_notify_solver_teacher_courses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_teacher_courses AFTER INSERT OR DELETE OR UPDATE ON public.teacher_courses FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: teachers trg_notify_solver_teachers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_teachers AFTER INSERT OR DELETE OR UPDATE ON public.teachers FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: teaching_schedules trg_notify_solver_teaching_schedules; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_teaching_schedules AFTER INSERT OR DELETE OR UPDATE ON public.teaching_schedules FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: time_slots trg_notify_solver_time_slots; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_solver_time_slots AFTER INSERT OR DELETE OR UPDATE ON public.time_slots FOR EACH STATEMENT EXECUTE FUNCTION public.fn_notify_solver_inputs_changed();


--
-- Name: profiles trg_profiles_sync_student; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_sync_student AFTER INSERT OR UPDATE OF facultad_id, carrera_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_sync_student_from_profile();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: schedule_feedback_events trg_schedule_feedback_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_schedule_feedback_events_updated_at BEFORE UPDATE ON public.schedule_feedback_events FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: solver_run_conflicts trg_solver_run_conflicts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_solver_run_conflicts_updated_at BEFORE UPDATE ON public.solver_run_conflicts FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: solver_runs trg_solver_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_solver_runs_updated_at BEFORE UPDATE ON public.solver_runs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: student_completed_courses trg_student_completed_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_completed_courses_updated_at BEFORE UPDATE ON public.student_completed_courses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: student_schedule_items trg_student_schedule_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_schedule_items_updated_at BEFORE UPDATE ON public.student_schedule_items FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: student_schedules trg_student_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_schedules_updated_at BEFORE UPDATE ON public.student_schedules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: students trg_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: teacher_availability trg_teacher_availability_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teacher_availability_updated_at BEFORE UPDATE ON public.teacher_availability FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: teacher_courses trg_teacher_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teacher_courses_updated_at BEFORE UPDATE ON public.teacher_courses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: teachers trg_teachers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: teaching_schedules trg_teaching_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teaching_schedules_updated_at BEFORE UPDATE ON public.teaching_schedules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: time_slots trg_time_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_time_slots_updated_at BEFORE UPDATE ON public.time_slots FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_corequisites course_corequisites_corequisite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_corequisites
    ADD CONSTRAINT course_corequisites_corequisite_id_fkey FOREIGN KEY (corequisite_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_corequisites course_corequisites_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_corequisites
    ADD CONSTRAINT course_corequisites_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: carreras fk_carreras_facultad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT fk_carreras_facultad FOREIGN KEY (facultad_id) REFERENCES public.facultades(id) ON DELETE CASCADE;


--
-- Name: classroom_course_components fk_ccc_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_course_components
    ADD CONSTRAINT fk_ccc_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_course_components fk_ccc_component; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_course_components
    ADD CONSTRAINT fk_ccc_component FOREIGN KEY (course_component_id) REFERENCES public.course_components(id) ON DELETE CASCADE;


--
-- Name: classroom_availability fk_classroom_availability_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_availability
    ADD CONSTRAINT fk_classroom_availability_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_availability fk_classroom_availability_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_availability
    ADD CONSTRAINT fk_classroom_availability_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE CASCADE;


--
-- Name: classroom_courses fk_classroom_courses_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_courses
    ADD CONSTRAINT fk_classroom_courses_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_courses fk_classroom_courses_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_courses
    ADD CONSTRAINT fk_classroom_courses_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_assignment_slots fk_course_assignment_slots_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_assignment FOREIGN KEY (course_assignment_id) REFERENCES public.course_schedule_assignments(id) ON DELETE CASCADE;


--
-- Name: course_assignment_slots fk_course_assignment_slots_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE RESTRICT;


--
-- Name: course_assignment_slots fk_course_assignment_slots_component; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_component FOREIGN KEY (course_component_id) REFERENCES public.course_components(id) ON DELETE RESTRICT;


--
-- Name: course_assignment_slots fk_course_assignment_slots_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: course_assignment_slots fk_course_assignment_slots_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE CASCADE;


--
-- Name: course_assignment_slots fk_course_assignment_slots_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE RESTRICT;


--
-- Name: course_assignment_slots fk_course_assignment_slots_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_assignment_slots
    ADD CONSTRAINT fk_course_assignment_slots_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: course_components fk_course_components_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_components
    ADD CONSTRAINT fk_course_components_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_prerequisites fk_course_prereq_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT fk_course_prereq_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_prerequisites fk_course_prereq_required; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT fk_course_prereq_required FOREIGN KEY (prerequisite_course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_schedule_assignments fk_course_schedule_assignments_component; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT fk_course_schedule_assignments_component FOREIGN KEY (course_component_id) REFERENCES public.course_components(id) ON DELETE RESTRICT;


--
-- Name: course_schedule_assignments fk_course_schedule_assignments_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT fk_course_schedule_assignments_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: course_schedule_assignments fk_course_schedule_assignments_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT fk_course_schedule_assignments_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE CASCADE;


--
-- Name: course_schedule_assignments fk_course_schedule_assignments_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT fk_course_schedule_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: course_sections fk_course_sections_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT fk_course_sections_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: course_sections fk_course_sections_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT fk_course_sections_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE CASCADE;


--
-- Name: course_schedule_assignments fk_csa_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_schedule_assignments
    ADD CONSTRAINT fk_csa_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE SET NULL;


--
-- Name: ml_prediction_logs fk_ml_prediction_logs_model; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_prediction_logs
    ADD CONSTRAINT fk_ml_prediction_logs_model FOREIGN KEY (model_id) REFERENCES public.ml_model_registry(id) ON DELETE CASCADE;


--
-- Name: ml_prediction_logs fk_ml_prediction_logs_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_prediction_logs
    ADD CONSTRAINT fk_ml_prediction_logs_run FOREIGN KEY (solver_run_id) REFERENCES public.solver_runs(id) ON DELETE SET NULL;


--
-- Name: oauth2_linked_accounts fk_oauth2_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth2_linked_accounts
    ADD CONSTRAINT fk_oauth2_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles fk_profile_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens fk_prt_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens fk_refresh_token_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_actor FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_assignment FOREIGN KEY (assignment_id) REFERENCES public.course_schedule_assignments(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_student_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_student_schedule FOREIGN KEY (student_schedule_id) REFERENCES public.student_schedules(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_teaching_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_teaching_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE SET NULL;


--
-- Name: solver_course_rules fk_solver_course_rules_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_course_rules
    ADD CONSTRAINT fk_solver_course_rules_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: solver_generation_reservations fk_solver_generation_reservations_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_generation_reservations
    ADD CONSTRAINT fk_solver_generation_reservations_actor FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: solver_generation_reservations fk_solver_generation_reservations_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_generation_reservations
    ADD CONSTRAINT fk_solver_generation_reservations_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: solver_run_conflicts fk_solver_run_conflicts_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: solver_run_conflicts fk_solver_run_conflicts_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_run FOREIGN KEY (solver_run_id) REFERENCES public.solver_runs(id) ON DELETE CASCADE;


--
-- Name: solver_run_conflicts fk_solver_run_conflicts_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE SET NULL;


--
-- Name: solver_runs fk_solver_runs_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_runs
    ADD CONSTRAINT fk_solver_runs_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: solver_runs fk_solver_runs_requested_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_runs
    ADD CONSTRAINT fk_solver_runs_requested_by FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: solver_runs fk_solver_runs_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_runs
    ADD CONSTRAINT fk_solver_runs_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: solver_runs fk_solver_runs_teaching_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_runs
    ADD CONSTRAINT fk_solver_runs_teaching_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE SET NULL;


--
-- Name: student_schedule_item_components fk_ssic_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_item_components
    ADD CONSTRAINT fk_ssic_assignment FOREIGN KEY (course_assignment_id) REFERENCES public.course_schedule_assignments(id) ON DELETE RESTRICT;


--
-- Name: student_schedule_item_components fk_ssic_component; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_item_components
    ADD CONSTRAINT fk_ssic_component FOREIGN KEY (course_component_id) REFERENCES public.course_components(id) ON DELETE RESTRICT;


--
-- Name: student_schedule_item_components fk_ssic_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_item_components
    ADD CONSTRAINT fk_ssic_item FOREIGN KEY (student_schedule_item_id) REFERENCES public.student_schedule_items(id) ON DELETE CASCADE;


--
-- Name: student_completed_courses fk_student_completed_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_completed_courses
    ADD CONSTRAINT fk_student_completed_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: student_completed_courses fk_student_completed_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_completed_courses
    ADD CONSTRAINT fk_student_completed_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_schedule_items fk_student_schedule_items_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT fk_student_schedule_items_assignment FOREIGN KEY (course_assignment_id) REFERENCES public.course_schedule_assignments(id) ON DELETE SET NULL;


--
-- Name: student_schedule_items fk_student_schedule_items_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT fk_student_schedule_items_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: student_schedule_items fk_student_schedule_items_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT fk_student_schedule_items_schedule FOREIGN KEY (student_schedule_id) REFERENCES public.student_schedules(id) ON DELETE CASCADE;


--
-- Name: student_schedule_items fk_student_schedule_items_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT fk_student_schedule_items_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_schedules fk_student_schedules_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedules
    ADD CONSTRAINT fk_student_schedules_generated_by FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: student_schedules fk_student_schedules_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedules
    ADD CONSTRAINT fk_student_schedules_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: student_schedules fk_student_schedules_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedules
    ADD CONSTRAINT fk_student_schedules_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students fk_students_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: teacher_availability fk_teacher_availability_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT fk_teacher_availability_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE CASCADE;


--
-- Name: teacher_availability fk_teacher_availability_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT fk_teacher_availability_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teacher_course_components fk_teacher_course_components_component; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_course_components
    ADD CONSTRAINT fk_teacher_course_components_component FOREIGN KEY (course_component_id) REFERENCES public.course_components(id) ON DELETE CASCADE;


--
-- Name: teacher_course_components fk_teacher_course_components_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_course_components
    ADD CONSTRAINT fk_teacher_course_components_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teacher_courses fk_teacher_courses_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT fk_teacher_courses_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: teacher_courses fk_teacher_courses_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT fk_teacher_courses_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teachers fk_teachers_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: teaching_schedules fk_teaching_schedules_confirmed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_schedules
    ADD CONSTRAINT fk_teaching_schedules_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: teaching_schedules fk_teaching_schedules_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_schedules
    ADD CONSTRAINT fk_teaching_schedules_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: teaching_schedules fk_teaching_schedules_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_schedules
    ADD CONSTRAINT fk_teaching_schedules_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_carrera_id_fkey FOREIGN KEY (carrera_id) REFERENCES public.carreras(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_facultad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_facultad_id_fkey FOREIGN KEY (facultad_id) REFERENCES public.facultades(id) ON DELETE SET NULL;


--
-- Name: students students_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_carrera_id_fkey FOREIGN KEY (carrera_id) REFERENCES public.carreras(id) ON DELETE SET NULL;


--
-- Name: students students_facultad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_facultad_id_fkey FOREIGN KEY (facultad_id) REFERENCES public.facultades(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 6F0pCafk6QTHAmYWT2aP4egJooYGdGCSKfOx4PLjUHOt62oPO8iJGWPZAsnzPsU

