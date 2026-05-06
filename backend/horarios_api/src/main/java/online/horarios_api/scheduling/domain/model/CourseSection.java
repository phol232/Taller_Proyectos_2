package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

/**
 * Sección de un curso dentro de un horario docente.
 * Cada sección tiene un NRC único de 5 dígitos que identifica
 * el grupo de clases para un estudiante al matricularse.
 */
public record CourseSection(
        UUID id,
        UUID teachingScheduleId,
        UUID courseId,
        String courseCode,
        String courseName,
        String nrc,
        int sectionNumber
) {}
