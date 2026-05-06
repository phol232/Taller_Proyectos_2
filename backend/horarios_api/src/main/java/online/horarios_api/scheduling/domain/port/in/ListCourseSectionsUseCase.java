package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.CourseSection;

import java.util.List;
import java.util.UUID;

/**
 * Caso de uso: listar secciones (con NRC) de un horario docente.
 */
public interface ListCourseSectionsUseCase {
    List<CourseSection> listBySchedule(UUID teachingScheduleId);
}
