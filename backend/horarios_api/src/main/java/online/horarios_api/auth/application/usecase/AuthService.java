package online.horarios_api.auth.application.usecase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.auth.domain.model.TokenPair;
import online.horarios_api.auth.domain.port.in.LoginUseCase;
import online.horarios_api.auth.domain.port.in.LogoutUseCase;
import online.horarios_api.auth.domain.port.in.OAuth2AuthUseCase;
import online.horarios_api.auth.domain.port.in.RefreshSessionUseCase;
import online.horarios_api.auth.domain.port.out.AuthenticationPort;
import online.horarios_api.auth.domain.port.out.JwtGeneratorPort;
import online.horarios_api.auth.domain.port.out.RefreshTokenManagerPort;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
public class AuthService
        implements LoginUseCase, RefreshSessionUseCase, LogoutUseCase,
                   OAuth2AuthUseCase {

    private final AuthenticationPort       authenticationPort;
    private final JwtGeneratorPort         jwtGeneratorPort;
    private final RefreshTokenManagerPort  refreshTokenManagerPort;
    private final UserReadPort             userReadPort;

    @Override
    @Transactional
    public AuthResult login(String email, String password, RequestMetadata metadata) {
        UserInfo user = authenticationPort.authenticate(email, password);

        log.info("Login email/password exitoso: userId={} email={} role={}",
                user.id(), user.email(), user.role());

        return issueTokens(user, metadata);
    }

    @Override
    @Transactional
    public AuthResult loginOAuth2(UserInfo user, RequestMetadata metadata) {
        log.info("Login OAuth2 exitoso: userId={} email={} role={}",
                user.id(), user.email(), user.role());
        return issueTokens(user, metadata);
    }

    @Override
    @Transactional
    public AuthResult refresh(String rawRefreshToken, RequestMetadata metadata) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token no encontrado");
        }

        UUID userId = refreshTokenManagerPort.validateAndRotate(rawRefreshToken);
        UserInfo user = userReadPort.findUserInfoById(userId)
                .orElseThrow(() -> new UnauthorizedException("Usuario no encontrado"));
        log.info("Refresh token rotado: userId={} email={}", user.id(), user.email());

        return issueTokens(user, metadata);
    }

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenManagerPort.revokeToken(rawRefreshToken);
        log.info("Logout exitoso: refresh token revocado");
    }

    @Override
    @Transactional
    public void logoutAll(UUID userId) {
        refreshTokenManagerPort.revokeAllTokensForUser(userId);
        log.info("Logout-all exitoso: userId={}", userId);
    }

    private AuthResult issueTokens(UserInfo user, RequestMetadata metadata) {
        String accessToken = jwtGeneratorPort.generateAccessToken(user);
        String refreshToken = refreshTokenManagerPort.createRefreshToken(
                user.id(),
                metadata.ipAddress(),
                metadata.userAgent()
        );

        TokenPair tokenPair = new TokenPair(accessToken, refreshToken);
        return new AuthResult(user, tokenPair);
    }
}
