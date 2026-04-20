package online.horarios_api.auth.domain.port.in;

import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;

public interface LoginUseCase {

    AuthResult login(String email, String password, RequestMetadata metadata);
}
