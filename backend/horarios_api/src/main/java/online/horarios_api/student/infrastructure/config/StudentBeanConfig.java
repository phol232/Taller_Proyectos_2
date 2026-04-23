package online.horarios_api.student.infrastructure.config;

import online.horarios_api.student.application.usecase.StudentService;
import online.horarios_api.student.domain.port.out.StudentPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StudentBeanConfig {

    @Bean
    public StudentService studentService(StudentPort studentPort) {
        return new StudentService(studentPort);
    }
}
