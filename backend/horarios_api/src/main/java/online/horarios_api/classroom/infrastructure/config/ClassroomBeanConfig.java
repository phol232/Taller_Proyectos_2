package online.horarios_api.classroom.infrastructure.config;

import online.horarios_api.classroom.application.usecase.ClassroomService;
import online.horarios_api.classroom.domain.port.out.ClassroomPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClassroomBeanConfig {

    @Bean
    public ClassroomService classroomService(ClassroomPort classroomPort) {
        return new ClassroomService(classroomPort);
    }
}
