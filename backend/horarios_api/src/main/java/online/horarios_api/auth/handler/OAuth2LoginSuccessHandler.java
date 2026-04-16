package online.horarios_api.auth.handler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.auth.dto.AuthResponse;
import online.horarios_api.auth.service.AuthService;
import online.horarios_api.config.AppProperties;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.service.UserService;
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

    private final AuthService    authService;
    private final UserService    userService;
    private final AppProperties  appProperties;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest  request,
                                        HttpServletResponse response,
                                        Authentication      authentication) throws IOException {

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauth2Token.getAuthorizedClientRegistrationId();

        OidcUser oidcUser = extractOidcUser(oauth2Token);
        if (oidcUser == null) {
            log.error("Principal no es OidcUser para el proveedor '{}'", registrationId);
            response.sendRedirect(appProperties.frontend().url() + "/login?error=oauth2_failed");
            return;
        }

        try {
            User user = userService.findOrCreateOAuth2User(oidcUser, registrationId);

            AuthResponse authResponse = authService.loginOAuth2(user, request, response);

            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }

            log.info("Login OAuth2 exitoso: userId={} provider={} email={} name={}",
                    authResponse.user().id(),
                    registrationId,
                    authResponse.user().email(),
                    authResponse.user().fullName());

            response.sendRedirect(appProperties.frontend().url() + "/callback");

        } catch (IllegalArgumentException e) {

            log.warn("Login OAuth2 rechazado: {}", e.getMessage());
            response.sendRedirect(appProperties.frontend().url() + "/login?error=" + e.getMessage());
        } catch (Exception e) {
            log.error("Error en OAuth2 success handler: {}", e.getMessage(), e);
            response.sendRedirect(appProperties.frontend().url() + "/login?error=oauth2_failed");
        }
    }

    private @Nullable OidcUser extractOidcUser(OAuth2AuthenticationToken token) {
        OAuth2User principal = token.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            return oidcUser;
        }
        return null;
    }
}
