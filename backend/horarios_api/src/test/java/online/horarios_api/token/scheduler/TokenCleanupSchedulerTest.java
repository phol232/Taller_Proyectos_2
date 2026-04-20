package online.horarios_api.token.scheduler;

import online.horarios_api.token.domain.port.in.TokenMaintenanceUseCase;
import online.horarios_api.token.infrastructure.out.scheduler.TokenCleanupScheduler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("TokenCleanupScheduler — tests unitarios")
class TokenCleanupSchedulerTest {

    @Mock
    private TokenMaintenanceUseCase tokenMaintenanceUseCase;

    @InjectMocks
    private TokenCleanupScheduler scheduler;

    @Test
    @DisplayName("cleanUpExpiredTokens delega al caso de uso")
    void cleanUpExpiredTokens_delegatesToUseCase() {
        scheduler.cleanUpExpiredTokens();

        verify(tokenMaintenanceUseCase).cleanUpExpiredTokens();
    }
}
