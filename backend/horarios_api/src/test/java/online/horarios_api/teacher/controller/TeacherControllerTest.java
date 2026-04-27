package online.horarios_api.teacher.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;
import online.horarios_api.shared.infrastructure.web.exception.GlobalExceptionHandler;
import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.port.in.TeacherCommandUseCase;
import online.horarios_api.teacher.domain.port.in.TeacherQueryUseCase;
import online.horarios_api.teacher.infrastructure.in.web.TeacherController;
import online.horarios_api.teacher.infrastructure.in.web.dto.TeacherRequest;
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
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TeacherController — tests MVC")
class TeacherControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TeacherCommandUseCase teacherCommandUseCase;

    @Mock
    private TeacherQueryUseCase teacherQueryUseCase;

    @InjectMocks
    private TeacherController controller;

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
    @DisplayName("POST /api/teachers: payload inválido → 400")
    void createTeacher_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/teachers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TeacherRequest(null, "", "", "", true, List.of(), List.of(), List.of())
                        )))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(teacherCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/teachers: payload válido → 200")
    void createTeacher_validPayload_returns200() throws Exception {
        Teacher teacher = new Teacher(
                UUID.randomUUID(), null, "DOC-01", "Ada Lovelace", null, "Matemática", true,
                List.of(new AvailabilitySlot(ScheduleDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), true)),
                List.of("INF-101"),
                List.of(),
                Instant.now(), Instant.now()
        );
        when(teacherCommandUseCase.createTeacher(any())).thenReturn(teacher);

        mockMvc.perform(post("/api/teachers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new TeacherRequest(
                                        null,
                                        "DOC-01",
                                        "Ada Lovelace",
                                        "Matemática",
                                        true,
                                        List.of(new online.horarios_api.shared.infrastructure.in.web.dto.AvailabilitySlotRequest(
                                                ScheduleDay.MONDAY,
                                                "08:00",
                                                "10:00",
                                                true
                                        )),
                                        List.of("INF-101"),
                                        List.of()
                                )
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DOC-01"))
                .andExpect(jsonPath("$.courseCodes[0]").value("INF-101"));
    }
}
