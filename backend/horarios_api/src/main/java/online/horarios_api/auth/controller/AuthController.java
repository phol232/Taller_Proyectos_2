package online.horarios_api.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.dto.AuthResponse;
import online.horarios_api.auth.dto.LoginRequest;
import online.horarios_api.auth.dto.UserInfoResponse;
import online.horarios_api.auth.service.AuthService;
import online.horarios_api.token.dto.SessionResponse;
import online.horarios_api.token.service.RefreshTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "HU-01: Login, logout y gestión de sesión")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @Operation(summary = "Login con email y contraseña",
               description = "Emite access token y refresh token en cookies httpOnly.")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest  httpRequest,
            HttpServletResponse httpResponse) {

        AuthResponse body = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "Rotar refresh token",
               description = "Revoca el refresh token actual y emite uno nuevo. " +
                             "Actualiza también el access token.")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletRequest  httpRequest,
            HttpServletResponse httpResponse) {

        AuthResponse body = authService.refresh(refreshToken, httpRequest, httpResponse);
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "Información del usuario autenticado")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserInfoResponse> me(
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(authService.getCurrentUser(jwt));
    }

    @Operation(summary = "Cerrar sesión",
               description = "Revoca el refresh token y borra las cookies de autenticación.")
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletResponse httpResponse) {

        authService.logout(refreshToken, httpResponse);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cerrar sesión en todos los dispositivos",
               description = "Revoca todos los refresh tokens del usuario y borra las cookies de autenticación.")
    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logoutAll(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletResponse httpResponse) {

        authService.logoutAll(jwt, httpResponse);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar sesiones activas del usuario")
    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SessionResponse>> listSessions(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(refreshTokenService.listActiveSessions(userId));
    }

    @Operation(summary = "Revocar una sesión específica por ID")
    @DeleteMapping("/sessions/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> revokeSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        refreshTokenService.revokeSessionById(sessionId, userId);
        return ResponseEntity.noContent().build();
    }
}
