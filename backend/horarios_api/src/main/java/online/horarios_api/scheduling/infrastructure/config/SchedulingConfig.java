package online.horarios_api.scheduling.infrastructure.config;

import online.horarios_api.scheduling.application.usecase.ListCourseSectionsUseCaseImpl;
import online.horarios_api.scheduling.application.usecase.ScheduleBuilderService;
import online.horarios_api.scheduling.application.usecase.ScheduleGenerationService;
import online.horarios_api.scheduling.application.usecase.StudentScheduleService;
import online.horarios_api.scheduling.domain.port.in.ListCourseSectionsUseCase;
import online.horarios_api.scheduling.domain.port.in.ScheduleBuilderUseCase;
import online.horarios_api.scheduling.domain.port.in.ScheduleGenerationUseCase;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleUseCase;
import online.horarios_api.scheduling.domain.port.out.CourseSectionRepository;
import online.horarios_api.scheduling.domain.port.out.ScheduleBuilderRepository;
import online.horarios_api.scheduling.domain.port.out.ScheduleGenerationRepository;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.util.List;

@Configuration
public class SchedulingConfig {

    @Bean
    public ListCourseSectionsUseCase listCourseSectionsUseCase(CourseSectionRepository repository) {
        return new ListCourseSectionsUseCaseImpl(repository);
    }

    @Bean
    public ScheduleGenerationUseCase scheduleGenerationUseCase(
            ScheduleGenerationRepository repository,
            SolverClientPort solverClient
    ) {
        return new ScheduleGenerationService(repository, solverClient, new SecureRandom());
    }

    @Bean
    public ScheduleBuilderUseCase scheduleBuilderUseCase(ScheduleBuilderRepository repository) {
        return new ScheduleBuilderService(repository);
    }

    @Bean
    public StudentScheduleUseCase studentScheduleUseCase(
            StudentScheduleRepository repository,
            SolverClientPort solverClient
    ) {
        return new StudentScheduleService(repository, solverClient);
    }

    @Bean
    public RestClient.Builder restClientBuilder() {
        RestTemplate template = new RestTemplate(List.of(new JacksonJsonHttpMessageConverter()));
        return RestClient.builder(template);
    }
}
