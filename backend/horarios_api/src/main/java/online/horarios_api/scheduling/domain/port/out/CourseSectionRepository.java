package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.CourseSection;

import java.util.List;
import java.util.UUID;

/**
 * Puerto de salida hacia la persistencia de secciones.
 */
public interface CourseSectionRepository {
    List<CourseSection> findByTeachingScheduleId(UUID teachingScheduleId);
}
