package online.horarios_api.course.domain.port.in;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;

import java.util.UUID;

public interface CourseCommandUseCase {
    Course createCourse(CourseData command);
    Course updateCourse(UUID courseId, CourseData command);
    void deactivateCourse(UUID courseId);
    void deleteCourse(UUID courseId);
}
