package online.horarios_api.auth.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.application.dto.AuthResponse;
import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.auth.domain.port.in.GetCurrentUserUseCase;
import online.horarios_api.auth.domain.port.in.LoginUseCase;
import online.horarios_api.auth.domain.port.in.LogoutUseCase;
import online.horarios_api.auth.domain.port.in.RefreshSessionUseCase;
import online.horarios_api.auth.domain.port.out.AuthCookiePort;
import online.horarios_api.auth.infrastructure.in.web.dto.LoginRequest;
import online.horarios_api.shared.infrastructure.web.RequestMetadataExtractor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "HU-01: Login, logout y gestión de sesión")
public class AuthController {

    private final LoginUseCase          loginUseCase;
    private final RefreshSessionUseCase refreshSessionUseCase;
    private final LogoutUseCase         logoutUseCase;
    private final GetCurrentUserUseCase getCurrentUserUseCase;
    private final AuthCookiePort        cookiePort;

    @Operation(summary = "Login con email y contraseña",
               description = "Emite access token y refresh token en cookies httpOnly.")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest  httpRequest,
            HttpServletResponse httpResponse) {

        RequestMetadata metadata = RequestMetadataExtractor.extract(httpRequest);
        AuthResult result = loginUseCase.login(request.email(), request.password(), metadata);
        setAuthCookies(httpResponse, result);
        return ResponseEntity.ok(new AuthResponse(result.user()));
    }

    @Operation(summary = "Rotar refresh token",
               description = "Revoca el refresh token actual y emite uno nuevo.")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletRequest  httpRequest,
            HttpServletResponse httpResponse) {

        RequestMetadata metadata = RequestMetadataExtractor.extract(httpRequest);
        AuthResult result = refreshSessionUseCase.refresh(refreshToken, metadata);
        setAuthCookies(httpResponse, result);
        return ResponseEntity.ok(new AuthResponse(result.user()));
    }

    @Operation(summary = "Información del usuario autenticado")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(getCurrentUserUseCase.getCurrentUser(userId));
    }

    @Operation(summary = "Cerrar sesión",
               description = "Revoca el refresh token y borra las cookies de autenticación.")
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletResponse httpResponse) {

        logoutUseCase.logout(refreshToken);
        cookiePort.buildExpiredCookies().forEach(c -> httpResponse.addHeader("Set-Cookie", c));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cerrar sesión en todos los dispositivos",
               description = "Revoca todos los refresh tokens del usuario.")
    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logoutAll(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletResponse httpResponse) {

        UUID userId = UUID.fromString(jwt.getSubject());
        logoutUseCase.logoutAll(userId);
        cookiePort.buildExpiredCookies().forEach(c -> httpResponse.addHeader("Set-Cookie", c));
        return ResponseEntity.noContent().build();
    }

    private void setAuthCookies(HttpServletResponse response, AuthResult result) {
        response.addHeader("Set-Cookie", cookiePort.buildAccessTokenCookie(result.tokenPair().accessToken()));
        response.addHeader("Set-Cookie", cookiePort.buildRefreshTokenCookie(result.tokenPair().refreshToken()));
    }
}
