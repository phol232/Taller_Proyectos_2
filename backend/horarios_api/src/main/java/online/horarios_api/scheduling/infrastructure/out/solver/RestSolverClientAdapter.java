package online.horarios_api.scheduling.infrastructure.out.solver;

import online.horarios_api.scheduling.domain.model.SolverRunAccepted;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.scheduling.infrastructure.config.SolverProperties;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class RestSolverClientAdapter implements SolverClientPort {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;
    private final SolverProperties properties;

    public RestSolverClientAdapter(RestClient.Builder builder, SolverProperties properties) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .build();
    }

    @Override
    public SolverRunAccepted runTeacherSchedule(
            UUID academicPeriodId,
            UUID requestedBy,
            int seed,
            int timeLimitMs,
            UUID reservationId,
            List<UUID> classroomIds
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("academic_period_id", academicPeriodId.toString());
        body.put("run_type", "TEACHER");
        body.put("requested_by", requestedBy.toString());
        body.put("time_limit_ms", timeLimitMs);
        body.put("seed", seed);
        body.put("keep_existing_drafts", true);
        body.put("rate_limit_reservation_id", reservationId.toString());
        body.put("classroom_ids", classroomIds.stream().map(UUID::toString).toList());

        Map<String, Object> response = restClient.post()
                .uri("/api/solver/run")
                .header("X-Solver-Internal-Token", properties.internalToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(MAP_TYPE);

        if (response == null || response.get("solver_run_id") == null) {
            throw new BadRequestException("El solver no devolvió un run válido.");
        }
        return new SolverRunAccepted(
                UUID.fromString((String) response.get("solver_run_id")),
                (String) response.get("status"),
                (String) response.get("websocket_url")
        );
    }
}
