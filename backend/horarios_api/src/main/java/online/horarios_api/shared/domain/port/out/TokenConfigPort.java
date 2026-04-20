package online.horarios_api.shared.domain.port.out;

public interface TokenConfigPort {

    long getAccessTokenExpirationSeconds();

    long getRefreshTokenExpirationSeconds();
}
