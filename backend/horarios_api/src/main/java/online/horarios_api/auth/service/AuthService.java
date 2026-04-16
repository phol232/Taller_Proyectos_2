package online.horarios_api.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.dto.AuthResponse;
import online.horarios_api.auth.dto.LoginRequest;
import online.horarios_api.auth.dto.UserInfoResponse;
import online.horarios_api.token.service.RefreshTokenService;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.repository.UserRepository;
import online.horarios_api.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager  authenticationManager;
    private final JwtService             jwtService;
    private final RefreshTokenService    refreshTokenService;
    private final CookieService          cookieService;
    private final UserRepository         userRepository;
    private final UserService            userService;

    @Transactional
    public AuthResponse login(LoginRequest request,
                              HttpServletRequest  httpRequest,
                              HttpServletResponse httpResponse) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UUID userId = UUID.fromString(authentication.getName());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        return issueTokensAndSetCookies(user, httpRequest, httpResponse);
    }

    @Transactional
    public AuthResponse loginOAuth2(User user,
                                    HttpServletRequest  httpRequest,
                                    HttpServletResponse httpResponse) {
        return issueTokensAndSetCookies(user, httpRequest, httpResponse);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken,
                                HttpServletRequest  httpRequest,
                                HttpServletResponse httpResponse) {

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Refresh token no encontrado");
        }

        User user = refreshTokenService.validateAndRotate(rawRefreshToken);

        return issueTokensAndSetCookies(user, httpRequest, httpResponse);
    }

    @Transactional
    public void logout(String rawRefreshToken, HttpServletResponse httpResponse) {
        refreshTokenService.revokeToken(rawRefreshToken);
        cookieService.clearAuthCookies(httpResponse);
    }

    @Transactional
    public void logoutAll(Jwt jwt, HttpServletResponse httpResponse) {
        UUID userId = UUID.fromString(jwt.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Usuario no encontrado"));
        refreshTokenService.revokeAllTokensForUser(user);
        cookieService.clearAuthCookies(httpResponse);
    }

    @Transactional(readOnly = true)
    public UserInfoResponse getCurrentUser(Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Usuario no encontrado"));
        return userService.toUserInfoResponse(user);
    }


    private AuthResponse issueTokensAndSetCookies(User user,
                                                   HttpServletRequest  request,
                                                   HttpServletResponse response) {
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(
                user,
                extractClientIp(request),
                request.getHeader("User-Agent")
        );

        cookieService.setAccessTokenCookie(response, accessToken);
        cookieService.setRefreshTokenCookie(response, refreshToken);

        return new AuthResponse(userService.toUserInfoResponse(user));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
