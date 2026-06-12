package online.horarios_api.course.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.integration.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Courses API — integración (seguridad + servicio real)")
class CourseApiIntegrationTest extends IntegrationTest {

    private final ObjectMapper json = new ObjectMapper();

    // ── Seguridad en GET /api/courses ────────────────────────────────────

    @Test
    @DisplayName("GET /api/courses: sin autenticación → 401 desde Spring Security")
    void listCourses_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/courses: rol STUDENT → 403 desde @PreAuthorize")
    void listCourses_asStudent_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "STUDENT");

        mockMvc.perform(get("/api/courses")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/courses: rol TEACHER → 403 desde @PreAuthorize")
    void listCourses_asTeacher_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "TEACHER");

        mockMvc.perform(get("/api/courses")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/courses: rol ADMIN → 200 con lista de cursos")
    void listCourses_asAdmin_returns200WithList() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        Course fakeCourse = new Course(
                UUID.randomUUID(), "INF-101", "Programación I",
                1, 3, 0, new BigDecimal("3"),
                "LABORATORY", true, List.of(), List.of(),
                Instant.now(), Instant.now()
        );
        Page<Course> page = new Page<>(List.of(fakeCourse), 1, 12, 1, 1);
        when(coursePort.findAllPaged(anyInt(), anyInt())).thenReturn(page);

        mockMvc.perform(get("/api/courses")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value("INF-101"))
                .andExpect(jsonPath("$.content[0].name").value("Programación I"));
    }

    // ── POST /api/courses — validación y creación ────────────────────────

    @Test
    @DisplayName("POST /api/courses: rol ADMIN, payload inválido (code vacío) → 400")
    void createCourse_invalidPayload_returns400() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        Map<String, Object> payload = Map.of(
                "code", "",
                "name", "",
                "cycle", 0,
                "credits", 0,
                "weeklyHours", 0
        );

        mockMvc.perform(post("/api/courses")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/courses: rol ADMIN, payload válido → 200 con el curso creado")
    void createCourse_validPayload_returns200() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        Map<String, Object> payload = Map.of(
                "code", "INF-101",
                "name", "Programación I",
                "cycle", 1,
                "credits", 3,
                "weeklyHours", 3,
                "requiredRoomType", "LABORATORY",
                "isActive", true
        );

        Course created = new Course(
                UUID.randomUUID(), "INF-101", "Programación I",
                1, 3, 0, new BigDecimal("3"),
                "laboratory", true, List.of(), List.of(),
                Instant.now(), Instant.now()
        );
        when(coursePort.create(any())).thenReturn(created);

        mockMvc.perform(post("/api/courses")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("INF-101"));
    }

    // ── GET /api/courses/search — verificar que COORDINATOR también accede ──

    @Test
    @DisplayName("GET /api/courses/search: rol COORDINATOR → 403 (solo ADMIN en este endpoint)")
    void searchCourses_asCoordinator_returns403() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "COORDINATOR");

        mockMvc.perform(get("/api/courses/search")
                        .param("q", "prog")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/courses/search: rol ADMIN, query válida → 200")
    void searchCourses_asAdmin_returns200() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "ADMIN");

        when(coursePort.searchPaged(anyString(), anyInt(), anyInt()))
                .thenReturn(new Page<>(List.of(), 1, 12, 0, 0));

        mockMvc.perform(get("/api/courses/search")
                        .param("q", "prog")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
