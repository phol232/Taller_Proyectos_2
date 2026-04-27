package online.horarios_api.classroom.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.port.in.ClassroomCommandUseCase;
import online.horarios_api.classroom.domain.port.in.ClassroomQueryUseCase;
import online.horarios_api.classroom.infrastructure.in.web.ClassroomController;
import online.horarios_api.classroom.infrastructure.in.web.dto.ClassroomRequest;
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
@DisplayName("ClassroomController — tests MVC")
class ClassroomControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ClassroomCommandUseCase classroomCommandUseCase;

    @Mock
    private ClassroomQueryUseCase classroomQueryUseCase;

    @InjectMocks
    private ClassroomController controller;

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
    @DisplayName("POST /api/classrooms: payload inválido → 400")
    void createClassroom_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/classrooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ClassroomRequest("", "", 0, "", true, List.of(), List.of(), List.of())
                        )))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(classroomCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/classrooms: payload válido → 200")
    void createClassroom_validPayload_returns200() throws Exception {
        Classroom classroom = new Classroom(UUID.randomUUID(), "A-101", "Aula 101", 30, "Laboratorio",
                true, List.of(), List.of(), List.of(), Instant.now(), Instant.now());
        when(classroomCommandUseCase.createClassroom(any())).thenReturn(classroom);

        mockMvc.perform(post("/api/classrooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ClassroomRequest("A-101", "Aula 101", 30, "Laboratorio", true, List.of(), List.of(), List.of())
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("A-101"));
    }
}
