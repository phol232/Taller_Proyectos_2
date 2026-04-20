package online.horarios_api.token.infrastructure.out.scheduler;

import lombok.RequiredArgsConstructor;
import online.horarios_api.token.domain.port.in.TokenMaintenanceUseCase;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TokenCleanupScheduler {

    private final TokenMaintenanceUseCase tokenMaintenanceUseCase;

    @Scheduled(fixedRateString = "PT6H")
    public void cleanUpExpiredTokens() {
        tokenMaintenanceUseCase.cleanUpExpiredTokens();
    }
}
