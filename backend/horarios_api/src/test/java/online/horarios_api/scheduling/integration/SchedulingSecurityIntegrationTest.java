package online.horarios_api.scheduling.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import online.horarios_api.scheduling.domain.model.TimeSlot;
import online.horarios_api.shared.integration.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Scheduling — integración (seguridad por roles + servicio real)")
class SchedulingSecurityIntegrationTest extends IntegrationTest {

    private final ObjectMapper json = new ObjectMapper();

    // ── GET /api/schedules/time-slots ────────────────────────────────────

    @Test
    @DisplayName("GET /time-slots: sin autenticación → 401")
    void listTimeSlots_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/schedules/time-slots"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /time-slots: rol STUDENT → 403 (requiere ADMIN o COORDINATOR)")
    void listTimeSlots_asStudent_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "STUDENT");

        mockMvc.perform(get("/api/schedules/time-slots")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /time-slots: rol ADMIN → 200 con lista de franjas")
    void listTimeSlots_asAdmin_returns200() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        TimeSlot slot = new TimeSlot(
                UUID.randomUUID(), "MONDAY",
                LocalTime.of(7, 0), LocalTime.of(8, 30), 1
        );
        when(scheduleBuilderRepository.listActiveTimeSlots()).thenReturn(List.of(slot));

        mockMvc.perform(get("/api/schedules/time-slots")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].dayOfWeek").value("MONDAY"));
    }

    @Test
    @DisplayName("GET /time-slots: rol COORDINATOR → 200")
    void listTimeSlots_asCoordinator_returns200() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "COORDINATOR");

        when(scheduleBuilderRepository.listActiveTimeSlots()).thenReturn(List.of());

        mockMvc.perform(get("/api/schedules/time-slots")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ── POST /api/schedules/generations ─────────────────────────────────

    @Test
    @DisplayName("POST /generations: sin autenticación → 401")
    void generateSchedule_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/schedules/generations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /generations: rol TEACHER → 403 (solo ADMIN/COORDINATOR)")
    void generateSchedule_asTeacher_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "TEACHER");
        // Payload válido para que Bean Validation no bloquee antes que @PreAuthorize
        String validPayload = json.writeValueAsString(
                java.util.Map.of(
                        "academicPeriodId", UUID.randomUUID().toString(),
                        "classroomIds", java.util.List.of(UUID.randomUUID().toString())
                ));

        mockMvc.perform(post("/api/schedules/generations")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /generations: rol ADMIN, payload vacío → 400 por validación")
    void generateSchedule_asAdmin_invalidPayload_returns400() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        mockMvc.perform(post("/api/schedules/generations")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/schedules/options ───────────────────────────────────────

    @Test
    @DisplayName("GET /options: rol STUDENT → 403")
    void getOptions_asStudent_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "STUDENT");

        mockMvc.perform(get("/api/schedules/options")
                        .param("academicPeriodId", UUID.randomUUID().toString())
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /options: rol ADMIN con periodId → 200")
    void getOptions_asAdmin_returns200() throws Exception {
        UUID periodId = UUID.randomUUID();
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        when(scheduleGenerationRepository.listOptions(periodId)).thenReturn(List.of());

        mockMvc.perform(get("/api/schedules/options")
                        .param("academicPeriodId", periodId.toString())
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
