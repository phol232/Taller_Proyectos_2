package online.horarios_api.course.infrastructure.config;

import online.horarios_api.course.application.usecase.CourseService;
import online.horarios_api.course.domain.port.out.CoursePort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CourseBeanConfig {

    @Bean
    public CourseService courseService(CoursePort coursePort) {
        return new CourseService(coursePort);
    }
}
