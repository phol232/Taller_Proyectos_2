package online.horarios_api.course.domain.port.out;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.shared.domain.model.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoursePort {
    Course create(CourseData command);
    Course update(UUID courseId, CourseData command);
    Optional<Course> findById(UUID courseId);
    List<Course> findAll();
    List<Course> searchByCodeOrName(String query);
    Page<Course> findAllPaged(int page, int pageSize);
    Page<Course> searchPaged(String query, int page, int pageSize);
    void deactivate(UUID courseId);
    void delete(UUID courseId);
}
