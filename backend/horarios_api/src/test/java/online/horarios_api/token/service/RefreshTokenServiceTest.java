package online.horarios_api.token.service;

import online.horarios_api.shared.domain.exception.ForbiddenException;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.token.application.usecase.RefreshTokenService;
import online.horarios_api.token.domain.model.RefreshToken;
import online.horarios_api.token.domain.port.out.RefreshTokenPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService — lógica de negocio")
class RefreshTokenServiceTest {

    @Mock private RefreshTokenPort refreshTokenPort;
    @Mock private TokenConfigPort tokenConfigPort;
    @Mock private TokenHasherPort tokenHasherPort;

    @InjectMocks
    private RefreshTokenService service;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        lenient().when(tokenConfigPort.getRefreshTokenExpirationSeconds()).thenReturn(3600L);
        lenient().when(tokenHasherPort.generateRawToken()).thenReturn("raw-token");
        lenient().when(tokenHasherPort.hash("raw-token")).thenReturn("hashed-token");
    }

    @Test
    @DisplayName("createRefreshToken: persiste token para el userId")
    void createRefreshToken_persistsTokenForUserId() {
        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);

        String rawToken = service.createRefreshToken(userId, "127.0.0.1", "JUnit");

        assertThat(rawToken).isEqualTo("raw-token");
        verify(refreshTokenPort).deleteExpiredOrRevokedByUserId(eq(userId), any(Instant.class));
        verify(refreshTokenPort).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getUserId()).isEqualTo(userId);
        assertThat(tokenCaptor.getValue().getTokenHash()).isEqualTo("hashed-token");
        assertThat(tokenCaptor.getValue().isRevoked()).isFalse();
    }

    @Test
    @DisplayName("validateAndRotate: token válido → devuelve userId y revoca token")
    void validateAndRotate_validToken_returnsUserId() {
        RefreshToken token = RefreshToken.issueFor(
                userId,
                "hashed-token",
                Instant.now().plusSeconds(600),
                "127.0.0.1",
                "JUnit"
        );
        when(refreshTokenPort.findActiveByTokenHash("hashed-token")).thenReturn(Optional.of(token));

        UUID resolvedUserId = service.validateAndRotate("raw-token");

        assertThat(resolvedUserId).isEqualTo(userId);
        verify(refreshTokenPort).revokeByTokenHash(eq("hashed-token"), any(Instant.class));
    }

    @Test
    @DisplayName("validateAndRotate: token expirado → lanza UnauthorizedException")
    void validateAndRotate_expiredToken_throwsUnauthorized() {
        RefreshToken token = RefreshToken.issueFor(
                userId,
                "hashed-token",
                Instant.now().minusSeconds(10),
                "127.0.0.1",
                "JUnit"
        );
        when(refreshTokenPort.findActiveByTokenHash("hashed-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.validateAndRotate("raw-token"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("revokeSessionById: usuario distinto → lanza ForbiddenException")
    void revokeSessionById_otherUser_throwsForbidden() {
        UUID sessionId = UUID.randomUUID();
        RefreshToken token = new RefreshToken(sessionId, userId, "hashed-token",
                Instant.now().plusSeconds(600), false, null, "127.0.0.1", "JUnit", null);
        when(refreshTokenPort.findById(sessionId)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.revokeSessionById(sessionId, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }
}
