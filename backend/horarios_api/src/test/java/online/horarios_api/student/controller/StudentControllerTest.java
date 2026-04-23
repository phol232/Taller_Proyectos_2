package online.horarios_api.student.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.shared.infrastructure.web.exception.GlobalExceptionHandler;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.port.in.StudentCommandUseCase;
import online.horarios_api.student.domain.port.in.StudentQueryUseCase;
import online.horarios_api.student.infrastructure.in.web.StudentController;
import online.horarios_api.student.infrastructure.in.web.dto.StudentRequest;
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
@DisplayName("StudentController — tests MVC")
class StudentControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private StudentCommandUseCase studentCommandUseCase;

    @Mock
    private StudentQueryUseCase studentQueryUseCase;

    @InjectMocks
    private StudentController controller;

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
    @DisplayName("POST /api/students: payload inválido → 400")
    void createStudent_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StudentRequest(null, "", "", 0, "", 0, true, null, null, List.of())
                        )))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(studentCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/students: payload válido → 200")
    void createStudent_validPayload_returns200() throws Exception {
        Student student = new Student(UUID.randomUUID(), null, "EST-01", "Estudiante Test",
                5, "Ingeniería", 22, true, null, null, null,
                List.of("INF-101"), Instant.now(), Instant.now());
        when(studentCommandUseCase.createStudent(any())).thenReturn(student);

        mockMvc.perform(post("/api/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StudentRequest(null, "EST-01", "Estudiante Test", 5, "Ingeniería", 22, true, null, null, List.of("INF-101"))
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("EST-01"));
    }
}
