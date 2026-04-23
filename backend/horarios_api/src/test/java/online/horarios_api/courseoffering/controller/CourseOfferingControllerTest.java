package online.horarios_api.courseoffering.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingCommandUseCase;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingQueryUseCase;
import online.horarios_api.courseoffering.infrastructure.in.web.CourseOfferingController;
import online.horarios_api.courseoffering.infrastructure.in.web.dto.CourseOfferingRequest;
import online.horarios_api.shared.infrastructure.web.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseOfferingController — tests MVC")
class CourseOfferingControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseOfferingCommandUseCase courseOfferingCommandUseCase;

    @Mock
    private CourseOfferingQueryUseCase courseOfferingQueryUseCase;

    @InjectMocks
    private CourseOfferingController controller;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setValidator(validator)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/course-offerings: payload inválido → 400")
    void createCourseOffering_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CourseOfferingRequest(null, null, -1, "", List.of())
                        )))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(courseOfferingCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/course-offerings: payload válido → 200")
    void createCourseOffering_validPayload_returns200() throws Exception {
        CourseOffering offering = new CourseOffering(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                25, "DRAFT", List.of(), Instant.now(), Instant.now());
        when(courseOfferingCommandUseCase.createCourseOffering(any())).thenReturn(offering);

        mockMvc.perform(post("/api/course-offerings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CourseOfferingRequest(UUID.randomUUID(), UUID.randomUUID(), 25, "DRAFT", List.of())
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expectedEnrollment").value(25));
    }
}
