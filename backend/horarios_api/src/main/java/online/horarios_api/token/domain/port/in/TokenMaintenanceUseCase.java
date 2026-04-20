package online.horarios_api.token.domain.port.in;

public interface TokenMaintenanceUseCase {

    void cleanUpExpiredTokens();
}
