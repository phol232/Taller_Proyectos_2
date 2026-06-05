package online.horarios_api.scheduling.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.ScheduleAssignmentSlot;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.TimeSlot;
import online.horarios_api.scheduling.domain.port.in.ScheduleBuilderUseCase;
import online.horarios_api.scheduling.infrastructure.in.web.ScheduleBuilderController;
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

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScheduleBuilderController — tests MVC")
class ScheduleBuilderControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ScheduleBuilderUseCase scheduleBuilderUseCase;

    @InjectMocks
    private ScheduleBuilderController controller;

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
    @DisplayName("GET /api/schedules/time-slots: retorna franjas activas")
    void listTimeSlotsReturnsOk() throws Exception {
        UUID slotId = UUID.randomUUID();
        when(scheduleBuilderUseCase.listActiveTimeSlots()).thenReturn(List.of(
                new TimeSlot(slotId, "MONDAY", LocalTime.of(7, 0), LocalTime.of(8, 30), 1)
        ));

        mockMvc.perform(get("/api/schedules/time-slots"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(slotId.toString()))
                .andExpect(jsonPath("$[0].dayOfWeek").value("MONDAY"))
                .andExpect(jsonPath("$[0].startTime").value("07:00"))
                .andExpect(jsonPath("$[0].endTime").value("08:30"));
    }

    @Test
    @DisplayName("GET /api/schedules/{id}/assignments: retorna asignaciones con franjas")
    void listAssignmentsReturnsOk() throws Exception {
        UUID scheduleId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID slotId = UUID.randomUUID();

        when(scheduleBuilderUseCase.listAssignments(scheduleId)).thenReturn(List.of(
                new ScheduleAssignment(
                        assignmentId,
                        UUID.randomUUID(),
                        "INF-101",
                        "Programación",
                        UUID.randomUUID(),
                        "THEORY",
                        BigDecimal.valueOf(3),
                        UUID.randomUUID(),
                        "DOC-1",
                        "Docente Uno",
                        null,
                        null,
                        "DRAFT",
                        BigDecimal.valueOf(1.5),
                        false,
                        List.of(new ScheduleAssignmentSlot(
                                slotId,
                                UUID.randomUUID(),
                                "MONDAY",
                                "07:00",
                                "08:30",
                                UUID.randomUUID(),
                                "A-101",
                                "Aula 101"
                        ))
                )
        ));

        mockMvc.perform(get("/api/schedules/{scheduleId}/assignments", scheduleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assignmentId").value(assignmentId.toString()))
                .andExpect(jsonPath("$[0].courseCode").value("INF-101"))
                .andExpect(jsonPath("$[0].slots[0].slotId").value(slotId.toString()))
                .andExpect(jsonPath("$[0].slots[0].classroomCode").value("A-101"));
    }

    @Test
    @DisplayName("POST /api/schedules/{id}/assignments: payload válido retorna assignmentId")
    void addAssignmentReturnsAssignmentId() throws Exception {
        UUID scheduleId = UUID.randomUUID();
        UUID componentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID sectionId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID timeSlotId = UUID.randomUUID();

        when(scheduleBuilderUseCase.addCourse(eq(scheduleId), eq(componentId), eq(teacherId), eq(sectionId), any()))
                .thenReturn(assignmentId);

        mockMvc.perform(post("/api/schedules/{scheduleId}/assignments", scheduleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "courseComponentId", componentId,
                                "teacherId", teacherId,
                                "sectionId", sectionId,
                                "slots", List.of(Map.of(
                                        "classroomId", classroomId,
                                        "timeSlotId", timeSlotId,
                                        "startTime", "07:00",
                                        "endTime", "08:30"
                                ))
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentId").value(assignmentId.toString()));

        verify(scheduleBuilderUseCase).addCourse(eq(scheduleId), eq(componentId), eq(teacherId), eq(sectionId), any());
    }

    @Test
    @DisplayName("POST /api/schedules/{id}/assignments: payload inválido retorna 400")
    void addAssignmentInvalidPayloadReturns400() throws Exception {
        mockMvc.perform(post("/api/schedules/{scheduleId}/assignments", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("teacherId", UUID.randomUUID()))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(scheduleBuilderUseCase);
    }

    @Test
    @DisplayName("POST /api/schedules/assignments/{id}/slots: crea franja")
    void addSlotReturnsSlotId() throws Exception {
        UUID assignmentId = UUID.randomUUID();
        UUID slotId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID timeSlotId = UUID.randomUUID();

        when(scheduleBuilderUseCase.addSlot(eq(assignmentId), any())).thenReturn(slotId);

        mockMvc.perform(post("/api/schedules/assignments/{assignmentId}/slots", assignmentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "classroomId", classroomId,
                                "timeSlotId", timeSlotId,
                                "startTime", "14:00",
                                "endTime", "15:30"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slotId").value(slotId.toString()));
    }

    @Test
    @DisplayName("DELETE /api/schedules/slots/{id}: retorna estado de asignación")
    void removeSlotReturnsResult() throws Exception {
        UUID slotId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        when(scheduleBuilderUseCase.removeSlot(slotId)).thenReturn(new RemovedSlotResult(
                assignmentId,
                true,
                BigDecimal.valueOf(1.5),
                BigDecimal.valueOf(3)
        ));

        mockMvc.perform(delete("/api/schedules/slots/{slotId}", slotId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignmentId").value(assignmentId.toString()))
                .andExpect(jsonPath("$.assignmentLeftIncomplete").value(true))
                .andExpect(jsonPath("$.assignedHours").value(1.5))
                .andExpect(jsonPath("$.requiredHours").value(3));
    }

    @Test
    @DisplayName("DELETE /api/schedules/assignments/{id}: elimina asignación")
    void removeAssignmentReturnsNoContent() throws Exception {
        UUID assignmentId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schedules/assignments/{assignmentId}", assignmentId))
                .andExpect(status().isNoContent());

        verify(scheduleBuilderUseCase).removeAssignment(assignmentId);
    }

    @Test
    @DisplayName("POST /api/schedules/{id}/validate: retorna conflictos")
    void validateSlotReturnsConflicts() throws Exception {
        UUID scheduleId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID timeSlotId = UUID.randomUUID();

        when(scheduleBuilderUseCase.validateSlot(
                eq(scheduleId),
                eq(null),
                eq(teacherId),
                eq(classroomId),
                eq(timeSlotId),
                eq(LocalTime.of(7, 0)),
                eq(LocalTime.of(8, 30)),
                eq(null)
        )).thenReturn(List.of(new SlotConflict("TEACHER_BUSY", teacherId, "Docente ocupado.")));

        mockMvc.perform(post("/api/schedules/{scheduleId}/validate", scheduleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teacherId", teacherId,
                                "classroomId", classroomId,
                                "timeSlotId", timeSlotId,
                                "startTime", "07:00",
                                "endTime", "08:30"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].conflictType").value("TEACHER_BUSY"))
                .andExpect(jsonPath("$[0].resourceId").value(teacherId.toString()))
                .andExpect(jsonPath("$[0].message").value("Docente ocupado."));
    }
}
