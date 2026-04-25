package online.horarios_api.auth.infrastructure.in.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private final FrontendRedirectResolver frontendRedirectResolver;

    @Override
    public void onAuthenticationFailure(@NonNull HttpServletRequest request,
                                        @NonNull HttpServletResponse response,
                                        @NonNull AuthenticationException exception) throws IOException {

        log.warn("Fallo en autenticación OAuth2: {}", exception.getMessage());

        String errorParam = URLEncoder.encode("oauth2_error", StandardCharsets.UTF_8);
        response.sendRedirect(frontendRedirectResolver.resolveBaseUrl(request) + "/login?error=" + errorParam);
    }
}
