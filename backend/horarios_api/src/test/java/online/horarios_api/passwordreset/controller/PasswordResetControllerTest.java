package online.horarios_api.passwordreset.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.passwordreset.infrastructure.in.web.PasswordResetController;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.ForgotPasswordRequest;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.ResetPasswordRequest;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.VerifyOtpRequest;
import online.horarios_api.passwordreset.domain.model.OtpVerificationResult;
import online.horarios_api.passwordreset.application.usecase.PasswordResetService;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.TooManyRequestsException;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PasswordResetController — tests de integración MVC")
class PasswordResetControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock  private PasswordResetService passwordResetService;
    @InjectMocks private PasswordResetController controller;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setValidator(validator)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static final String REQUEST_URL = "/api/auth/password-reset/request";
    private static final String VERIFY_URL  = "/api/auth/password-reset/verify";
    private static final String RESET_URL   = "/api/auth/password-reset/reset";


    @Test
    @DisplayName("POST /request: email válido → 200 con mensaje genérico")
    void requestOtp_validEmail_returns200WithGenericMessage() throws Exception {
        when(passwordResetService.requestOtp("user@continental.edu.pe"))
                .thenReturn("Si el correo existe, recibirás un código.");

        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ForgotPasswordRequest("user@continental.edu.pe"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("POST /request: dominio inválido → 400 sin llamar al servicio")
    void requestOtp_invalidDomain_returns400() throws Exception {
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ForgotPasswordRequest("user@gmail.com"))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(passwordResetService);
    }

    @Test
    @DisplayName("POST /request: email nulo → 400")
    void requestOtp_nullEmail_returns400() throws Exception {
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":null}"))
                .andExpect(status().isBadRequest());
    }


    @Test
    @DisplayName("POST /verify: OTP correcto → 200 con resetToken")
    void verifyOtp_correctOtp_returns200WithResetToken() throws Exception {
        when(passwordResetService.verifyOtp("user@continental.edu.pe", "123456"))
                .thenReturn(new OtpVerificationResult("reset-token-abc123"));

        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new VerifyOtpRequest("user@continental.edu.pe", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").value("reset-token-abc123"));
    }

    @Test
    @DisplayName("POST /verify: OTP de 5 dígitos → 400 sin llamar al servicio")
    void verifyOtp_tooShortOtp_returns400() throws Exception {
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new VerifyOtpRequest("user@continental.edu.pe", "12345"))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(passwordResetService);
    }

    @Test
    @DisplayName("POST /verify: OTP incorrecto (servicio lanza 400) → 400")
    void verifyOtp_wrongOtp_returns400FromService() throws Exception {
        when(passwordResetService.verifyOtp(any(), any()))
                .thenThrow(new BadRequestException("OTP incorrecto"));

        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new VerifyOtpRequest("user@continental.edu.pe", "999999"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /verify: máximo de intentos (servicio lanza 429) → 429")
    void verifyOtp_maxAttempts_returns429() throws Exception {
        when(passwordResetService.verifyOtp(any(), any()))
                .thenThrow(new TooManyRequestsException("Demasiados intentos"));

        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new VerifyOtpRequest("user@continental.edu.pe", "123456"))))
                .andExpect(status().isTooManyRequests());
    }


    @Test
    @DisplayName("POST /reset: token válido + contraseña → 200")
    void resetPassword_validToken_returns200() throws Exception {
        doNothing().when(passwordResetService).resetPassword(any(), any());

        mockMvc.perform(post(RESET_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest("valid-reset-token", "NewSecurePass1!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Contraseña actualizada correctamente."));
    }

    @Test
    @DisplayName("POST /reset: contraseña menor a 8 chars → 400 sin llamar al servicio")
    void resetPassword_shortPassword_returns400() throws Exception {
        mockMvc.perform(post(RESET_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest("some-token", "short"))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(passwordResetService);
    }

    @Test
    @DisplayName("POST /reset: token inválido (servicio lanza 400) → 400")
    void resetPassword_invalidToken_returns400() throws Exception {
        doThrow(new BadRequestException("Token inválido"))
                .when(passwordResetService).resetPassword(any(), any());

        mockMvc.perform(post(RESET_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest("expired-token", "NewSecurePass1!"))))
                .andExpect(status().isBadRequest());
    }
}
