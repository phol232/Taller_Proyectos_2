package online.horarios_api.auth.domain.port.in;

import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;

public interface RefreshSessionUseCase {

    AuthResult refresh(String rawRefreshToken, RequestMetadata metadata);
}
