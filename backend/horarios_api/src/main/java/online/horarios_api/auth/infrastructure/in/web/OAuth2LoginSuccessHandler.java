package online.horarios_api.auth.infrastructure.in.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.shared.domain.model.OAuth2UserInfo;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.auth.domain.port.in.OAuth2AuthUseCase;
import online.horarios_api.auth.domain.port.out.AuthCookiePort;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import online.horarios_api.shared.domain.exception.DomainException;
import online.horarios_api.shared.infrastructure.web.RequestMetadataExtractor;
import online.horarios_api.student.domain.port.in.StudentProvisioningUseCase;
import online.horarios_api.user.domain.port.in.OAuth2UserResolutionUseCase;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
@NullMarked
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final OAuth2AuthUseCase             oAuth2AuthUseCase;
    private final OAuth2UserResolutionUseCase   oAuth2UserResolutionUseCase;
    private final AppProperties                 appProperties;
    private final AuthCookiePort                cookiePort;
    private final StudentProvisioningUseCase    studentProvisioningUseCase;
    private final FrontendRedirectResolver      frontendRedirectResolver;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest  request,
                                        HttpServletResponse response,
                                        Authentication      authentication) throws IOException {

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauth2Token.getAuthorizedClientRegistrationId();
        String frontendBaseUrl = frontendRedirectResolver.resolveBaseUrl(request);

        OidcUser oidcUser = extractOidcUser(oauth2Token);
        if (oidcUser == null) {
            log.error("Principal no es OidcUser para el proveedor '{}'", registrationId);
            response.sendRedirect(frontendBaseUrl + "/login?error=oauth2_failed");
            return;
        }

        try {
            OAuth2UserInfo oauth2UserInfo = mapToOAuth2UserInfo(oidcUser, registrationId);
            UserInfo user = oAuth2UserResolutionUseCase.findOrCreateOAuth2User(oauth2UserInfo);
// Aprovisionamiento automático: si el usuario es STUDENT y aún no
            // tiene registro en `students`, se crea uno base. Errores se logean
            // pero nunca interrumpen el flujo de login.
            if ("STUDENT".equals(user.role())) {
                try {
                    studentProvisioningUseCase.provisionStudentIfAbsent(
                            user.id(), user.email(), user.fullName());
                } catch (Exception ex) {
                    log.warn("No se pudo provisionar estudiante para userId={}: {}",
                            user.id(), ex.getMessage());
                }
            }

            
            RequestMetadata metadata = RequestMetadataExtractor.extract(request);
            AuthResult authResult = oAuth2AuthUseCase.loginOAuth2(user, metadata);

            response.addHeader("Set-Cookie", cookiePort.buildAccessTokenCookie(authResult.tokenPair().accessToken()));
            response.addHeader("Set-Cookie", cookiePort.buildRefreshTokenCookie(authResult.tokenPair().refreshToken()));

            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }

            log.debug("OAuth2 handler: redirigiendo userId={} provider={}", authResult.user().id(), registrationId);
            response.sendRedirect(frontendBaseUrl + "/callback");

        } catch (DomainException e) {
            log.warn("Login OAuth2 rechazado: {}", e.getMessage());
            response.sendRedirect(frontendBaseUrl + "/login?error=" + e.getMessage());
        } catch (Exception e) {
            log.error("Error en OAuth2 success handler: {}", e.getMessage(), e);
            response.sendRedirect(frontendBaseUrl + "/login?error=oauth2_failed");
        }
    }

    private @Nullable OidcUser extractOidcUser(OAuth2AuthenticationToken token) {
        OAuth2User principal = token.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            return oidcUser;
        }
        return null;
    }

    private OAuth2UserInfo mapToOAuth2UserInfo(OidcUser oidcUser, String registrationId) {
        return new OAuth2UserInfo(
                oidcUser.getSubject(),
                oidcUser.getEmail(),
                oidcUser.getFullName(),
                oidcUser.getPicture(),
                registrationId
        );
    }
}
