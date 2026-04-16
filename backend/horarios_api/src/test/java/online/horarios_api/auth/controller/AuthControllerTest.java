package online.horarios_api.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.auth.dto.AuthResponse;
import online.horarios_api.auth.dto.LoginRequest;
import online.horarios_api.auth.dto.UserInfoResponse;
import online.horarios_api.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController — tests de integración MVC")
class AuthControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock  private AuthService authService;
    @InjectMocks private AuthController controller;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setValidator(validator)
                .build();
    }

    private static final String LOGIN_URL = "/api/auth/login";


    @Test
    @DisplayName("POST /login: credenciales válidas → 200 con AuthResponse")
    void login_validCredentials_returns200() throws Exception {
        AuthResponse authResponse = new AuthResponse(
                new UserInfoResponse(
                        java.util.UUID.randomUUID(),
                        "user@continental.edu.pe",
                        "Usuario Test",
                        "STUDENT",
                        null));

        when(authService.login(any(), any(), any())).thenReturn(authResponse);

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("user@continental.edu.pe", "Password1!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("user@continental.edu.pe"));
    }


    @Test
    @DisplayName("POST /login: dominio inválido → 400")
    void login_invalidDomain_returns400() throws Exception {
        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("user@gmail.com", "Password1!"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /login: email vacío → 400")
    void login_emptyEmail_returns400() throws Exception {
        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("", "Password1!"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /login: contraseña menor a 8 caracteres → 400")
    void login_shortPassword_returns400() throws Exception {
        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("user@continental.edu.pe", "short"))))
                .andExpect(status().isBadRequest());
    }


    @Test
    @DisplayName("POST /login: servicio lanza 401 → 401")
    void login_serviceThrows401_returns401() throws Exception {
        when(authService.login(any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("user@continental.edu.pe", "WrongPass1!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /login: servicio lanza 403 → 403")
    void login_serviceThrows403_returns403() throws Exception {
        when(authService.login(any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta desactivada"));

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("user@continental.edu.pe", "Password1!"))))
                .andExpect(status().isForbidden());
    }
}
