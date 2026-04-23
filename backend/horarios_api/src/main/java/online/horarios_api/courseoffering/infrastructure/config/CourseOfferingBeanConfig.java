package online.horarios_api.courseoffering.infrastructure.config;

import online.horarios_api.courseoffering.application.usecase.CourseOfferingService;
import online.horarios_api.courseoffering.domain.port.out.CourseOfferingPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CourseOfferingBeanConfig {

    @Bean
    public CourseOfferingService courseOfferingService(CourseOfferingPort courseOfferingPort) {
        return new CourseOfferingService(courseOfferingPort);
    }
}
