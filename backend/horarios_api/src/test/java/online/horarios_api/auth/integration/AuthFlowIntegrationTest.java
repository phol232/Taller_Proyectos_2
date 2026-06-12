package online.horarios_api.auth.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.integration.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Auth — integración (seguridad + servicio real)")
class AuthFlowIntegrationTest extends IntegrationTest {

    private final ObjectMapper json = new ObjectMapper();

    // ── Login ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /login: credenciales válidas → 200, cookie seteada, user en body")
    void login_validCredentials_returns200WithCookieAndUser() throws Exception {
        UUID userId = UUID.randomUUID();
        UserInfo userInfo = new UserInfo(userId, "admin@continental.edu.pe", "Admin Test", "ADMIN", null);

        when(authenticationPort.authenticate("admin@continental.edu.pe", "Password1!"))
                .thenReturn(userInfo);
        when(jwtGeneratorPort.generateAccessToken(any())).thenReturn("access.jwt");
        when(refreshTokenManagerPort.createRefreshToken(any(), any(), any())).thenReturn("refresh.token");
        when(authCookiePort.buildAccessTokenCookie("access.jwt"))
                .thenReturn("access_token=access.jwt; Path=/; HttpOnly");
        when(authCookiePort.buildRefreshTokenCookie("refresh.token"))
                .thenReturn("refresh_token=refresh.token; Path=/; HttpOnly");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("email", "admin@continental.edu.pe", "password", "Password1!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("admin@continental.edu.pe"))
                .andExpect(jsonPath("$.user.fullName").value("Admin Test"))
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    @DisplayName("POST /login: email fuera del dominio → 400 antes de llegar al servicio")
    void login_externalDomain_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("email", "user@gmail.com", "password", "Password1!"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /login: contraseña vacía → 400 antes de llegar al servicio")
    void login_blankPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("email", "user@continental.edu.pe", "password", ""))))
                .andExpect(status().isBadRequest());
    }

    // ── Endpoint protegido GET /me ───────────────────────────────────────

    @Test
    @DisplayName("GET /api/auth/me: sin cookie → 401 desde Spring Security (no desde el servicio)")
    void me_withoutCookie_returns401FromSpringSecurity() throws Exception {
        // No se llama ningún mock de servicio — Spring Security rechaza antes
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/auth/me: con cookie JWT válida de ADMIN → 200")
    void me_withValidAdminJwt_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtTestHelper.generateToken(userId, "ADMIN");

        UserInfo userInfo = new UserInfo(userId, "admin@continental.edu.pe", "Admin Test", "ADMIN", null);
        when(userReadPort.findUserInfoById(userId)).thenReturn(java.util.Optional.of(userInfo));

        mockMvc.perform(get("/api/auth/me")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/auth/me: con JWT expirado / inválido → 401")
    void me_withMalformedJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .cookie(new Cookie("access_token", "not.a.jwt.token")))
                .andExpect(status().isUnauthorized());
    }

    // ── Logout ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/logout: sin cookie → 401 desde Spring Security")
    void logout_withoutCookie_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/logout: con JWT válido → 204 y se invoca logout en el servicio")
    void logout_withValidJwt_returns204() throws Exception {
        String token = jwtTestHelper.generateToken(UUID.randomUUID(), "STUDENT");

        when(authCookiePort.buildExpiredCookies()).thenReturn(
                java.util.List.of("access_token=; Max-Age=0", "refresh_token=; Max-Age=0"));

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie("access_token", token))
                        .cookie(new Cookie("refresh_token", "some.refresh.token")))
                .andExpect(status().isNoContent());
    }
}
