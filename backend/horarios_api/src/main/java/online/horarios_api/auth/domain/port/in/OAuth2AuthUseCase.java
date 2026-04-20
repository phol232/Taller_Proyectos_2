package online.horarios_api.auth.domain.port.in;

import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.shared.domain.model.UserInfo;

public interface OAuth2AuthUseCase {

    AuthResult loginOAuth2(UserInfo user, RequestMetadata metadata);
}
