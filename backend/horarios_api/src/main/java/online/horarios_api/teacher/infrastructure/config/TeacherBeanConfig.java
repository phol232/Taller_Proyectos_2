package online.horarios_api.teacher.infrastructure.config;

import online.horarios_api.teacher.application.usecase.TeacherService;
import online.horarios_api.teacher.domain.port.out.TeacherPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TeacherBeanConfig {

    @Bean
    public TeacherService teacherService(TeacherPort teacherPort) {
        return new TeacherService(teacherPort);
    }
}
