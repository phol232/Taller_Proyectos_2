--
-- PostgreSQL database dump
--

\restrict imv7T5Zg9Zvh5vvZovJhzDkrZiSgWuHsIqbfjFdBICzkyVH4mqRFPw29G8vgVLO

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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
-- Name: day_of_week; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.day_of_week AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY'
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
-- Name: fn_add_section_teacher_candidate(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_add_section_teacher_candidate(p_section_id uuid, p_teacher_id uuid, p_priority_weight numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO section_teacher_candidates(section_id, teacher_id, priority_weight)
    VALUES (p_section_id, p_teacher_id, COALESCE(p_priority_weight, 1.0))
    ON CONFLICT (section_id, teacher_id) DO UPDATE
        SET priority_weight = EXCLUDED.priority_weight;
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
-- Name: fn_cancel_course_offering(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cancel_course_offering(p_offering_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE course_offerings
    SET    status = 'CANCELLED'
    WHERE  id = p_offering_id;
END;
$$;


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
-- Name: fn_clear_course_offering_sections(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_clear_course_offering_sections(p_offering_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM course_sections
    WHERE  course_offering_id = p_offering_id;
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
    CONSTRAINT chk_academic_periods_status CHECK (((status)::text = ANY ((ARRAY['PLANNING'::character varying, 'ACTIVE'::character varying, 'CLOSED'::character varying])::text[])))
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
    weekly_hours integer NOT NULL,
    required_room_type character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courses_credits_check CHECK (((credits >= 1) AND (credits <= 6))),
    CONSTRAINT courses_weekly_hours_check CHECK ((weekly_hours >= 1))
);


--
-- Name: fn_create_course(character varying, character varying, integer, integer, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course(p_code character varying, p_name character varying, p_credits integer, p_weekly_hours integer, p_required_room_type character varying, p_is_active boolean) RETURNS public.courses
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course courses;
BEGIN
    INSERT INTO courses(code, name, credits, weekly_hours, required_room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), p_credits, p_weekly_hours, NULLIF(TRIM(p_required_room_type), ''), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_course;

    RETURN v_course;
END;
$$;


--
-- Name: course_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    academic_period_id uuid NOT NULL,
    course_id uuid NOT NULL,
    expected_enrollment integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_offerings_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'ACTIVE'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT course_offerings_expected_enrollment_check CHECK ((expected_enrollment >= 0))
);


--
-- Name: fn_create_course_offering(uuid, uuid, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course_offering(p_academic_period_id uuid, p_course_id uuid, p_expected_enrollment integer, p_status character varying) RETURNS public.course_offerings
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    INSERT INTO course_offerings(academic_period_id, course_id, expected_enrollment, status)
    VALUES (
               p_academic_period_id,
               p_course_id,
               COALESCE(p_expected_enrollment, 0),
               UPPER(TRIM(p_status))
           )
    RETURNING * INTO v_offering;

    RETURN v_offering;
END;
$$;


--
-- Name: course_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_offering_id uuid NOT NULL,
    section_code character varying(20) NOT NULL,
    vacancy_limit integer NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_sections_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'ACTIVE'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT course_sections_vacancy_limit_check CHECK ((vacancy_limit > 0))
);


--
-- Name: fn_create_course_section(uuid, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course_section(p_course_offering_id uuid, p_section_code character varying, p_vacancy_limit integer, p_status character varying) RETURNS public.course_sections
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_section course_sections;
BEGIN
    INSERT INTO course_sections(course_offering_id, section_code, vacancy_limit, status)
    VALUES (
               p_course_offering_id,
               UPPER(TRIM(p_section_code)),
               p_vacancy_limit,
               UPPER(TRIM(p_status))
           )
    RETURNING * INTO v_section;

    RETURN v_section;
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
    UPDATE users
    SET    is_active = FALSE
    WHERE  id = p_user_id;
END;
$$;


--
-- Name: fn_delete_academic_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_academic_period(p_period_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offerings_count         INTEGER;
    v_teaching_schedules      INTEGER;
    v_student_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE academic_period_id = p_period_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
            USING ERRCODE = '23503';
    END IF;

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
    FROM   section_assignments
    WHERE  classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % asignación(es) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

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
    v_offerings_count     INTEGER;
    v_prereq_of_count     INTEGER;
    v_completed_count     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE course_id = p_course_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
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
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   section_assignments sa
               JOIN   course_sections cs ON cs.id = sa.section_id
    WHERE  cs.course_offering_id = p_offering_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % asignación(es) en horarios y no puede eliminarse. Cancélela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM section_teacher_candidates
    WHERE  section_id IN (SELECT id FROM course_sections WHERE course_offering_id = p_offering_id);

    DELETE FROM course_sections WHERE course_offering_id = p_offering_id;
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
    FROM   section_assignments
    WHERE  teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM section_teacher_candidates WHERE teacher_id = p_teacher_id;
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
               EXTRACT(HOUR FROM p_start_time)::INTEGER * 60
                   + EXTRACT(MINUTE FROM p_start_time)::INTEGER,
               TRUE
           )
    ON CONFLICT (day_of_week, start_time, end_time) DO UPDATE
        SET is_active = TRUE
    RETURNING id INTO v_slot_id;

    RETURN v_slot_id;
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
-- Name: fn_get_course_offering_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_course_offering_by_id(p_offering_id uuid) RETURNS public.course_offerings
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    SELECT * INTO v_offering
    FROM   course_offerings
    WHERE  id = p_offering_id;

    RETURN v_offering;
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

CREATE FUNCTION public.fn_get_teacher_by_id(p_teacher_id uuid) RETURNS public.teachers
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_teacher teachers;
BEGIN
    SELECT * INTO v_teacher
    FROM   teachers
    WHERE  id = p_teacher_id;

    RETURN v_teacher;
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
-- Name: fn_list_all_course_offerings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_all_course_offerings() RETURNS SETOF public.course_offerings
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   course_offerings
        ORDER  BY created_at DESC;
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

CREATE FUNCTION public.fn_list_all_teachers() RETURNS SETOF public.teachers
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   teachers
        ORDER  BY full_name ASC;
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

CREATE FUNCTION public.fn_list_course_sections(p_offering_id uuid) RETURNS TABLE(id uuid, course_offering_id uuid, section_code character varying, vacancy_limit integer, status character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT cs.id,
               cs.course_offering_id,
               cs.section_code,
               cs.vacancy_limit,
               cs.status,
               cs.created_at,
               cs.updated_at
        FROM   course_sections cs
        WHERE  cs.course_offering_id = p_offering_id
        ORDER  BY cs.section_code ASC;
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
-- Name: fn_list_section_teacher_candidates(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_section_teacher_candidates(p_section_id uuid) RETURNS TABLE(teacher_id uuid, priority_weight numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT stc.teacher_id, stc.priority_weight
        FROM   section_teacher_candidates stc
        WHERE  stc.section_id = p_section_id
        ORDER  BY stc.priority_weight DESC, stc.teacher_id ASC;
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
-- Name: fn_search_course_offerings(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_course_offerings(p_query character varying) RETURNS SETOF public.course_offerings
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT co.*
        FROM   course_offerings co
                   JOIN   academic_periods ap ON ap.id = co.academic_period_id
                   JOIN   courses c ON c.id = co.course_id
        WHERE  c.code ILIKE '%' || p_query || '%'
           OR  c.name ILIKE '%' || p_query || '%'
           OR  ap.code ILIKE '%' || p_query || '%'
           OR  ap.name ILIKE '%' || p_query || '%'
        ORDER  BY co.created_at DESC;
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
        WHERE  code ILIKE '%' || p_query || '%'
           OR  name ILIKE '%' || p_query || '%'
        ORDER  BY code ASC;
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
-- Name: fn_search_teachers(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_search_teachers(p_query character varying) RETURNS SETOF public.teachers
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM   teachers
        WHERE  code ILIKE '%' || p_query || '%'
           OR  full_name ILIKE '%' || p_query || '%'
           OR  specialty ILIKE '%' || p_query || '%'
        ORDER  BY full_name ASC;
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
-- Name: fn_update_course(uuid, character varying, character varying, integer, integer, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_course(p_course_id uuid, p_code character varying, p_name character varying, p_credits integer, p_weekly_hours integer, p_required_room_type character varying, p_is_active boolean) RETURNS public.courses
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_course courses;
BEGIN
    UPDATE courses
    SET    code               = TRIM(p_code),
           name               = TRIM(p_name),
           credits            = p_credits,
           weekly_hours       = p_weekly_hours,
           required_room_type = NULLIF(TRIM(p_required_room_type), ''),
           is_active          = COALESCE(p_is_active, TRUE)
    WHERE  id = p_course_id
    RETURNING * INTO v_course;

    RETURN v_course;
END;
$$;


--
-- Name: fn_update_course_offering(uuid, uuid, uuid, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_course_offering(p_offering_id uuid, p_academic_period_id uuid, p_course_id uuid, p_expected_enrollment integer, p_status character varying) RETURNS public.course_offerings
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    UPDATE course_offerings
    SET    academic_period_id  = p_academic_period_id,
           course_id           = p_course_id,
           expected_enrollment = COALESCE(p_expected_enrollment, 0),
           status              = UPPER(TRIM(p_status))
    WHERE  id = p_offering_id
    RETURNING * INTO v_offering;

    RETURN v_offering;
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
    CONSTRAINT chk_ml_model_registry_status CHECK (((status)::text = ANY ((ARRAY['TRAINED'::character varying, 'ACTIVE'::character varying, 'ARCHIVED'::character varying])::text[])))
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
    CONSTRAINT chk_ml_training_runs_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'RUNNING'::character varying, 'SUCCEEDED'::character varying, 'FAILED'::character varying])::text[])))
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
    section_id uuid,
    assignment_id uuid,
    actor_user_id uuid,
    event_payload_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_assignment_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_assignment_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_assignment_id uuid NOT NULL,
    teaching_schedule_id uuid NOT NULL,
    section_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    time_slot_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teaching_schedule_id uuid NOT NULL,
    section_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    assignment_status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_section_assignments_status CHECK (((assignment_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: section_teacher_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_teacher_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    priority_weight numeric(8,4) DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT section_teacher_candidates_priority_weight_check CHECK ((priority_weight >= (0)::numeric))
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
    section_id uuid,
    time_slot_id uuid,
    message text NOT NULL,
    details_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT chk_solver_runs_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'RUNNING'::character varying, 'SUCCEEDED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT chk_solver_runs_type CHECK (((run_type)::text = ANY ((ARRAY['TEACHER'::character varying, 'STUDENT'::character varying])::text[]))),
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
-- Name: student_schedule_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_schedule_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_schedule_id uuid NOT NULL,
    student_id uuid NOT NULL,
    section_id uuid NOT NULL,
    course_id uuid NOT NULL,
    item_status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_student_schedule_items_status CHECK (((item_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'REMOVED'::character varying])::text[])))
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
    CONSTRAINT chk_student_schedules_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying])::text[])))
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
    CONSTRAINT chk_teaching_schedules_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying])::text[]))),
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
-- Name: academic_periods academic_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_periods
    ADD CONSTRAINT academic_periods_pkey PRIMARY KEY (id);


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
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: course_offerings course_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT course_offerings_pkey PRIMARY KEY (id);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (id);


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
-- Name: section_assignment_slots section_assignment_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT section_assignment_slots_pkey PRIMARY KEY (id);


--
-- Name: section_assignments section_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT section_assignments_pkey PRIMARY KEY (id);


--
-- Name: section_teacher_candidates section_teacher_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_teacher_candidates
    ADD CONSTRAINT section_teacher_candidates_pkey PRIMARY KEY (id);


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
-- Name: classrooms uq_classrooms_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT uq_classrooms_code UNIQUE (code);


--
-- Name: course_offerings uq_course_offerings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT uq_course_offerings UNIQUE (academic_period_id, course_id);


--
-- Name: course_prerequisites uq_course_prerequisites; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT uq_course_prerequisites UNIQUE (course_id, prerequisite_course_id);


--
-- Name: course_sections uq_course_sections; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT uq_course_sections UNIQUE (course_offering_id, section_code);


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
-- Name: section_assignment_slots uq_section_assignment_slots_assignment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT uq_section_assignment_slots_assignment UNIQUE (section_assignment_id, time_slot_id);


--
-- Name: section_assignment_slots uq_section_assignment_slots_classroom; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT uq_section_assignment_slots_classroom UNIQUE (teaching_schedule_id, classroom_id, time_slot_id);


--
-- Name: section_assignment_slots uq_section_assignment_slots_teacher; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT uq_section_assignment_slots_teacher UNIQUE (teaching_schedule_id, teacher_id, time_slot_id);


--
-- Name: section_assignments uq_section_assignments; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT uq_section_assignments UNIQUE (teaching_schedule_id, section_id);


--
-- Name: section_teacher_candidates uq_section_teacher_candidates; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_teacher_candidates
    ADD CONSTRAINT uq_section_teacher_candidates UNIQUE (section_id, teacher_id);


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
-- Name: student_schedule_items uq_student_schedule_items_section; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT uq_student_schedule_items_section UNIQUE (student_schedule_id, section_id);


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
-- Name: idx_classrooms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classrooms_active ON public.classrooms USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_course_offerings_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_offerings_course_id ON public.course_offerings USING btree (course_id);


--
-- Name: idx_course_offerings_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_offerings_period_id ON public.course_offerings USING btree (academic_period_id);


--
-- Name: idx_course_prerequisites_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_prerequisites_course_id ON public.course_prerequisites USING btree (course_id);


--
-- Name: idx_course_prerequisites_required_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_prerequisites_required_id ON public.course_prerequisites USING btree (prerequisite_course_id);


--
-- Name: idx_course_sections_offering_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_sections_offering_id ON public.course_sections USING btree (course_offering_id);


--
-- Name: idx_courses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_active ON public.courses USING btree (is_active) WHERE (is_active = true);


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
-- Name: idx_section_assignment_slots_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignment_slots_schedule_id ON public.section_assignment_slots USING btree (teaching_schedule_id);


--
-- Name: idx_section_assignment_slots_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignment_slots_section_id ON public.section_assignment_slots USING btree (section_id);


--
-- Name: idx_section_assignment_slots_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignment_slots_slot_id ON public.section_assignment_slots USING btree (time_slot_id);


--
-- Name: idx_section_assignments_classroom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignments_classroom_id ON public.section_assignments USING btree (classroom_id);


--
-- Name: idx_section_assignments_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignments_schedule_id ON public.section_assignments USING btree (teaching_schedule_id);


--
-- Name: idx_section_assignments_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_assignments_teacher_id ON public.section_assignments USING btree (teacher_id);


--
-- Name: idx_section_teacher_candidates_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_teacher_candidates_section_id ON public.section_teacher_candidates USING btree (section_id);


--
-- Name: idx_section_teacher_candidates_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_teacher_candidates_teacher_id ON public.section_teacher_candidates USING btree (teacher_id);


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
-- Name: idx_student_completed_courses_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_completed_courses_course_id ON public.student_completed_courses USING btree (course_id);


--
-- Name: idx_student_completed_courses_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_completed_courses_student_id ON public.student_completed_courses USING btree (student_id);


--
-- Name: idx_student_schedule_items_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedule_items_schedule_id ON public.student_schedule_items USING btree (student_schedule_id);


--
-- Name: idx_student_schedule_items_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_schedule_items_section_id ON public.student_schedule_items USING btree (section_id);


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

CREATE UNIQUE INDEX uq_student_schedules_active_per_period ON public.student_schedules USING btree (student_id, academic_period_id) WHERE ((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'CONFIRMED'::character varying])::text[]));


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
-- Name: classrooms trg_classrooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_classrooms_updated_at BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_offerings trg_course_offerings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_offerings_updated_at BEFORE UPDATE ON public.course_offerings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_prerequisites trg_course_prerequisites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_prerequisites_updated_at BEFORE UPDATE ON public.course_prerequisites FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: course_sections trg_course_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_sections_updated_at BEFORE UPDATE ON public.course_sections FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


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
-- Name: section_assignment_slots trg_section_assignment_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_assignment_slots_updated_at BEFORE UPDATE ON public.section_assignment_slots FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: section_assignments trg_section_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_assignments_updated_at BEFORE UPDATE ON public.section_assignments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: section_teacher_candidates trg_section_teacher_candidates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_teacher_candidates_updated_at BEFORE UPDATE ON public.section_teacher_candidates FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


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
-- Name: carreras fk_carreras_facultad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT fk_carreras_facultad FOREIGN KEY (facultad_id) REFERENCES public.facultades(id) ON DELETE CASCADE;


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
-- Name: course_offerings fk_course_offerings_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT fk_course_offerings_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_offerings fk_course_offerings_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT fk_course_offerings_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


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
-- Name: course_sections fk_course_sections_offering; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sections
    ADD CONSTRAINT fk_course_sections_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;


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
    ADD CONSTRAINT fk_schedule_feedback_events_assignment FOREIGN KEY (assignment_id) REFERENCES public.section_assignments(id) ON DELETE SET NULL;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_period FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE CASCADE;


--
-- Name: schedule_feedback_events fk_schedule_feedback_events_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_feedback_events
    ADD CONSTRAINT fk_schedule_feedback_events_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE SET NULL;


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
-- Name: section_assignment_slots fk_section_assignment_slots_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_assignment FOREIGN KEY (section_assignment_id) REFERENCES public.section_assignments(id) ON DELETE CASCADE;


--
-- Name: section_assignment_slots fk_section_assignment_slots_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE RESTRICT;


--
-- Name: section_assignment_slots fk_section_assignment_slots_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE CASCADE;


--
-- Name: section_assignment_slots fk_section_assignment_slots_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;


--
-- Name: section_assignment_slots fk_section_assignment_slots_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE RESTRICT;


--
-- Name: section_assignment_slots fk_section_assignment_slots_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignment_slots
    ADD CONSTRAINT fk_section_assignment_slots_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: section_assignments fk_section_assignments_classroom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT fk_section_assignments_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE RESTRICT;


--
-- Name: section_assignments fk_section_assignments_schedule; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT fk_section_assignments_schedule FOREIGN KEY (teaching_schedule_id) REFERENCES public.teaching_schedules(id) ON DELETE CASCADE;


--
-- Name: section_assignments fk_section_assignments_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT fk_section_assignments_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;


--
-- Name: section_assignments fk_section_assignments_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_assignments
    ADD CONSTRAINT fk_section_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: section_teacher_candidates fk_section_teacher_candidates_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_teacher_candidates
    ADD CONSTRAINT fk_section_teacher_candidates_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;


--
-- Name: section_teacher_candidates fk_section_teacher_candidates_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_teacher_candidates
    ADD CONSTRAINT fk_section_teacher_candidates_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: solver_run_conflicts fk_solver_run_conflicts_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_run FOREIGN KEY (solver_run_id) REFERENCES public.solver_runs(id) ON DELETE CASCADE;


--
-- Name: solver_run_conflicts fk_solver_run_conflicts_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solver_run_conflicts
    ADD CONSTRAINT fk_solver_run_conflicts_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE SET NULL;


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
-- Name: student_schedule_items fk_student_schedule_items_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_schedule_items
    ADD CONSTRAINT fk_student_schedule_items_section FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE RESTRICT;


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

\unrestrict imv7T5Zg9Zvh5vvZovJhzDkrZiSgWuHsIqbfjFdBICzkyVH4mqRFPw29G8vgVLO

