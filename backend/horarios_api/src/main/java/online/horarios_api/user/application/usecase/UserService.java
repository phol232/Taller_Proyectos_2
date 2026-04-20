package online.horarios_api.user.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.OAuth2UserInfo;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.in.OAuth2UserResolutionUseCase;
import online.horarios_api.user.domain.port.out.UserPort;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
public class UserService implements OAuth2UserResolutionUseCase {

    private final UserPort userPort;

    @Override
    @Transactional
    public UserInfo findOrCreateOAuth2User(OAuth2UserInfo oauth2UserInfo) {
        String subject  = oauth2UserInfo.subject();
        String email    = oauth2UserInfo.email();
        String fullName = oauth2UserInfo.fullName();
        String picture  = oauth2UserInfo.picture();
        String provider = oauth2UserInfo.provider();

        if (!User.isAllowedEmail(email)) {
            throw new BadRequestException("domain_not_allowed");
        }

        User user = userPort
                .findOAuth2Account(provider, subject)
                .map(link -> userPort.findById(link.getUserId())
                        .orElseThrow(() -> new NotFoundException("Usuario vinculado no encontrado")))
                .orElseGet(() -> {
                    User resolvedUser = userPort.findByEmail(email)
                            .orElseGet(() -> {
                                User newUser = User.registerOAuth2Student(
                                        email,
                                        fullName != null ? fullName : email,
                                        picture
                                );
                                return userPort.save(newUser);
                            });

                    OAuth2LinkedAccount link = OAuth2LinkedAccount.create(
                            resolvedUser.getId(), provider, subject, email);
                    userPort.saveOAuth2Account(link);
                    return resolvedUser;
                });

        return new UserInfo(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getAvatarUrl()
        );
    }
}
