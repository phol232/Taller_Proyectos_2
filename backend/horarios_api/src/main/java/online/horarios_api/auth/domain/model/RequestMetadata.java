package online.horarios_api.auth.domain.model;

public record RequestMetadata(
        String ipAddress,
        String userAgent
) {
    public static RequestMetadata empty() {
        return new RequestMetadata("unknown", "unknown");
    }
}
