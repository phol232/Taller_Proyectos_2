package online.horarios_api.token.controller;

import online.horarios_api.shared.infrastructure.web.exception.GlobalExceptionHandler;
import online.horarios_api.token.domain.model.SessionInfo;
import online.horarios_api.token.domain.port.in.RefreshTokenUseCase;
import online.horarios_api.token.infrastructure.in.web.SessionController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("SessionController — tests unitarios MVC")
class SessionControllerTest {

    private MockMvc mockMvc;

    @Mock private RefreshTokenUseCase refreshTokenUseCase;
    @InjectMocks private SessionController controller;

    private static final UUID USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        Jwt mockJwt = Jwt.withTokenValue("mock-token")
                .header("alg", "HS256")
                .subject(USER_ID.toString())
                .build();

        HandlerMethodArgumentResolver jwtResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Jwt.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return mockJwt;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(jwtResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /sessions: retorna lista de sesiones activas")
    void listSessions_returnsActiveSessions() throws Exception {
        SessionInfo session = new SessionInfo(
                UUID.randomUUID(), "127.0.0.1", "TestAgent",
                Instant.now(), Instant.now().plusSeconds(3600));
        when(refreshTokenUseCase.listActiveSessions(USER_ID)).thenReturn(List.of(session));

        mockMvc.perform(get("/api/auth/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ipAddress").value("127.0.0.1"));
    }

    @Test
    @DisplayName("DELETE /sessions/{id}: revoca sesión y retorna 204")
    void revokeSession_returns204() throws Exception {
        UUID sessionId = UUID.randomUUID();

        mockMvc.perform(delete("/api/auth/sessions/" + sessionId))
                .andExpect(status().isNoContent());

        verify(refreshTokenUseCase).revokeSessionById(sessionId, USER_ID);
    }
}
