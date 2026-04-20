package online.horarios_api.user.domain.port.in;

import online.horarios_api.shared.domain.model.OAuth2UserInfo;
import online.horarios_api.shared.domain.model.UserInfo;

public interface OAuth2UserResolutionUseCase {

    UserInfo findOrCreateOAuth2User(OAuth2UserInfo oauth2UserInfo);
}
