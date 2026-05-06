
CREATE OR REPLACE FUNCTION fn_sync_student_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE students
    SET    facultad_id = NEW.facultad_id,
           carrera_id  = NEW.carrera_id
    WHERE  user_id = NEW.user_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_profiles_sync_student
    AFTER INSERT OR UPDATE OF facultad_id, carrera_id ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_student_from_profile();

CREATE TRIGGER trg_facultades_updated_at
    BEFORE UPDATE ON facultades
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_carreras_updated_at
    BEFORE UPDATE ON carreras
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_academic_periods_updated_at
    BEFORE UPDATE ON academic_periods
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_time_slots_updated_at
    BEFORE UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_teacher_courses_updated_at
    BEFORE UPDATE ON teacher_courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_teacher_availability_updated_at
    BEFORE UPDATE ON teacher_availability
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_classroom_availability_updated_at
    BEFORE UPDATE ON classroom_availability
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_course_prerequisites_updated_at
    BEFORE UPDATE ON course_prerequisites
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_student_completed_courses_updated_at
    BEFORE UPDATE ON student_completed_courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_classroom_courses_updated_at
    BEFORE UPDATE ON classroom_courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_teaching_schedules_updated_at
    BEFORE UPDATE ON teaching_schedules
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_course_schedule_assignments_updated_at
    BEFORE UPDATE ON course_schedule_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_course_assignment_slots_updated_at
    BEFORE UPDATE ON course_assignment_slots
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_student_schedules_updated_at
    BEFORE UPDATE ON student_schedules
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_student_schedule_items_updated_at
    BEFORE UPDATE ON student_schedule_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_solver_runs_updated_at
    BEFORE UPDATE ON solver_runs
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_solver_run_conflicts_updated_at
    BEFORE UPDATE ON solver_run_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_schedule_feedback_events_updated_at
    BEFORE UPDATE ON schedule_feedback_events
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ml_feature_snapshots_updated_at
    BEFORE UPDATE ON ml_feature_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ml_training_runs_updated_at
    BEFORE UPDATE ON ml_training_runs
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ml_model_registry_updated_at
    BEFORE UPDATE ON ml_model_registry
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ml_prediction_logs_updated_at
    BEFORE UPDATE ON ml_prediction_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();
