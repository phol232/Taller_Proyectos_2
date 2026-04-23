package online.horarios_api.academicperiod.infrastructure.config;

import online.horarios_api.academicperiod.application.usecase.AcademicPeriodService;
import online.horarios_api.academicperiod.domain.port.out.AcademicPeriodPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AcademicPeriodBeanConfig {

    @Bean
    public AcademicPeriodService academicPeriodService(AcademicPeriodPort academicPeriodPort) {
        return new AcademicPeriodService(academicPeriodPort);
    }
}
