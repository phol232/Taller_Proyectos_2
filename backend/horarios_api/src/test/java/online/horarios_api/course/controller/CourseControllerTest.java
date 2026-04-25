package online.horarios_api.course.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.port.in.CourseCommandUseCase;
import online.horarios_api.course.domain.port.in.CourseQueryUseCase;
import online.horarios_api.course.infrastructure.in.web.CourseController;
import online.horarios_api.course.infrastructure.in.web.dto.CourseRequest;
import online.horarios_api.shared.domain.model.Page;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseController — tests MVC")
class CourseControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseCommandUseCase courseCommandUseCase;

    @Mock
    private CourseQueryUseCase courseQueryUseCase;

    @InjectMocks
    private CourseController controller;

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
    @DisplayName("GET /api/courses: retorna lista")
    void listCourses_returnsOk() throws Exception {
        when(courseQueryUseCase.listCoursesPaged(1, 12)).thenReturn(Page.of(List.of(
                new Course(UUID.randomUUID(), "INF-101", "Curso", 1, 4, 0,
                        4, "Presencial", true, List.of("MAT-001"), Instant.now(), Instant.now())
        ), 1, 12, 1));

        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value("INF-101"));
    }

    @Test
    @DisplayName("POST /api/courses: payload inválido → 400")
    void createCourse_invalidPayload_returns400() throws Exception {
        CourseRequest request = new CourseRequest("", "", 0, 0, 0, 0, null, true, List.of());

        mockMvc.perform(post("/api/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(courseCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/courses: payload válido → 200")
    void createCourse_validPayload_returns200() throws Exception {
        Course course = new Course(UUID.randomUUID(), "INF-101", "Curso", 1, 4, 0,
                4, "Presencial", true, List.of(), Instant.now(), Instant.now());
        when(courseCommandUseCase.createCourse(any())).thenReturn(course);

        mockMvc.perform(post("/api/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CourseRequest("INF-101", "Curso", 1, 4, 0, 4, "Presencial", true, List.of())
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("INF-101"))
                .andExpect(jsonPath("$.cycle").value(1));
    }
}
