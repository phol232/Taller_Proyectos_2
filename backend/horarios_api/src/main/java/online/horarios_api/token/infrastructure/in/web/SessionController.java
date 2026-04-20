package online.horarios_api.token.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import online.horarios_api.token.domain.model.SessionInfo;
import online.horarios_api.token.domain.port.in.RefreshTokenUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/sessions")
@RequiredArgsConstructor
@Tag(name = "Sesiones", description = "Gestión de sesiones activas del usuario")
public class SessionController {

    private final RefreshTokenUseCase refreshTokenUseCase;

    @Operation(summary = "Listar sesiones activas del usuario")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SessionInfo>> listSessions(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(refreshTokenUseCase.listActiveSessions(userId));
    }

    @Operation(summary = "Revocar una sesión específica")
    @DeleteMapping("/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> revokeSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        refreshTokenUseCase.revokeSessionById(sessionId, userId);
        return ResponseEntity.noContent().build();
    }
}
