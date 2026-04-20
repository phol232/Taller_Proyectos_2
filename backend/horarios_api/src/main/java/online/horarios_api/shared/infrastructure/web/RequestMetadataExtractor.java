package online.horarios_api.shared.infrastructure.web;

import jakarta.servlet.http.HttpServletRequest;
import online.horarios_api.auth.domain.model.RequestMetadata;

public final class RequestMetadataExtractor {

    private RequestMetadataExtractor() {}

    public static RequestMetadata extract(HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        return new RequestMetadata(ip, userAgent != null ? userAgent : "unknown");
    }

    private static String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
