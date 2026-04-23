package online.horarios_api.course.domain.port.out;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoursePort {
    Course create(CourseData command);
    Course update(UUID courseId, CourseData command);
    Optional<Course> findById(UUID courseId);
    List<Course> findAll();
    List<Course> searchByCodeOrName(String query);
    void deactivate(UUID courseId);
    void delete(UUID courseId);
}
