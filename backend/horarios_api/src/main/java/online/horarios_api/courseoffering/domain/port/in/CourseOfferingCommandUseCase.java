package online.horarios_api.courseoffering.domain.port.in;

import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;

import java.util.UUID;

public interface CourseOfferingCommandUseCase {
    CourseOffering createCourseOffering(CourseOfferingData command);
    CourseOffering updateCourseOffering(UUID offeringId, CourseOfferingData command);
    void cancelCourseOffering(UUID offeringId);
    void deleteCourseOffering(UUID offeringId);
}
