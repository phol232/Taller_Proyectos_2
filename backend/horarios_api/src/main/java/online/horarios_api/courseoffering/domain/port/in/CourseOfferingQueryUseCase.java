package online.horarios_api.courseoffering.domain.port.in;

import online.horarios_api.courseoffering.domain.model.CourseOffering;

import java.util.List;
import java.util.UUID;

public interface CourseOfferingQueryUseCase {
    CourseOffering getCourseOffering(UUID offeringId);
    List<CourseOffering> listCourseOfferings();
    List<CourseOffering> searchCourseOfferings(String query);
}
