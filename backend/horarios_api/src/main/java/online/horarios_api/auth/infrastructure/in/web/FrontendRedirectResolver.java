package online.horarios_api.auth.infrastructure.in.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class FrontendRedirectResolver {

    static final String SESSION_KEY = "oauth_frontend_origin";

    private final AppProperties appProperties;

    public void rememberRequestedFrontend(HttpServletRequest request) {
        String candidate = normalizeOrigin(request.getParameter("redirect_uri"));
        if (candidate == null) {
            candidate = extractFromHeaders(request);
        }

        if (candidate == null) {
            return;
        }

        if (!allowedOrigins().contains(candidate)) {
            log.warn("Frontend redirect rechazado por no estar permitido: {}", candidate);
            return;
        }

        request.getSession(true).setAttribute(SESSION_KEY, candidate);
    }

    public String resolveBaseUrl(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object stored = session.getAttribute(SESSION_KEY);
            if (stored instanceof String storedUrl) {
                session.removeAttribute(SESSION_KEY);
                String normalized = normalizeOrigin(storedUrl);
                if (normalized != null && allowedOrigins().contains(normalized)) {
                    return normalized;
                }
            }
        }

        String fromHeaders = extractFromHeaders(request);
        if (fromHeaders != null && allowedOrigins().contains(fromHeaders)) {
            return fromHeaders;
        }

        return fallbackFrontendUrl();
    }

    private String extractFromHeaders(HttpServletRequest request) {
        String origin = normalizeOrigin(request.getHeader("Origin"));
        if (origin != null) {
            return origin;
        }
        return normalizeOrigin(request.getHeader("Referer"));
    }

    private Set<String> allowedOrigins() {
        LinkedHashSet<String> origins = new LinkedHashSet<>();
        List<String> configuredOrigins = appProperties.cors().allowedOrigins();
        for (String origin : configuredOrigins) {
            String normalized = normalizeOrigin(origin);
            if (normalized != null) {
                origins.add(normalized);
            }
        }
        origins.add(fallbackFrontendUrl());
        return origins;
    }

    private String fallbackFrontendUrl() {
        String configured = appProperties.frontend().url();
        String firstValue = configured.split(",")[0].trim();
        String normalized = normalizeOrigin(firstValue);
        return normalized != null ? normalized : firstValue.replaceAll("/+$", "");
    }

    private String normalizeOrigin(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String candidate = value.split(",")[0].trim();
        try {
            URI uri = URI.create(candidate);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            StringBuilder origin = new StringBuilder()
                    .append(uri.getScheme())
                    .append("://")
                    .append(uri.getHost());
            if (uri.getPort() != -1) {
                origin.append(":").append(uri.getPort());
            }
            return origin.toString();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}