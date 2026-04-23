package online.horarios_api.courseoffering.domain.port.out;

import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseOfferingPort {
    CourseOffering create(CourseOfferingData command);
    CourseOffering update(UUID offeringId, CourseOfferingData command);
    Optional<CourseOffering> findById(UUID offeringId);
    List<CourseOffering> findAll();
    List<CourseOffering> search(String query);
    void cancel(UUID offeringId);
    void delete(UUID offeringId);
}
