package online.horarios_api.scheduling.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.solver")
public record SolverProperties(
        String baseUrl,
        String internalToken
) {}
