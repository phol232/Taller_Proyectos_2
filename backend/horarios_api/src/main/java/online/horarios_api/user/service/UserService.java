package online.horarios_api.user.service;

import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.dto.UserInfoResponse;
import online.horarios_api.user.entity.OAuth2LinkedAccount;
import online.horarios_api.user.entity.Role;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.repository.OAuth2LinkedAccountRepository;
import online.horarios_api.user.repository.UserRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final OAuth2LinkedAccountRepository oauth2LinkedAccountRepository;

    @Override
    @Transactional(readOnly = true)
    public @NonNull UserDetails loadUserByUsername(@NonNull String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (user.getPasswordHash() == null) {
            throw new UsernameNotFoundException("Esta cuenta usa inicio de sesión con Google");
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getId().toString())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .disabled(!user.isActive())
                .build();
    }

    @Transactional
    public User findOrCreateOAuth2User(OidcUser oidcUser, String registrationId) {
        String subject  = oidcUser.getSubject();
        String email    = oidcUser.getEmail();
        String fullName = oidcUser.getFullName();
        String picture  = oidcUser.getPicture();

        if (email == null || !email.toLowerCase().endsWith("continental.edu.pe")) {
            throw new IllegalArgumentException("domain_not_allowed");
        }

        return oauth2LinkedAccountRepository
                .findByProviderAndProviderSubject(registrationId, subject)
                .map(link -> userRepository.findById(link.getUser().getId())
                        .orElseThrow(() -> new IllegalStateException("Usuario vinculado no encontrado")))
                .orElseGet(() -> {
                    User user = userRepository.findByEmail(email)
                            .orElseGet(() -> {
                                User newUser = User.builder()
                                        .email(email)
                                        .fullName(fullName != null ? fullName : email)
                                        .role(Role.STUDENT)
                                        .emailVerified(true)
                                        .avatarUrl(picture)
                                        .build();
                                return userRepository.save(newUser);
                            });

                    OAuth2LinkedAccount link = OAuth2LinkedAccount.builder()
                            .user(user)
                            .provider(registrationId)
                            .providerSubject(subject)
                            .providerEmail(email)
                            .build();
                    oauth2LinkedAccountRepository.save(link);

                    return user;
                });
    }

    public UserInfoResponse toUserInfoResponse(User user) {
        return new UserInfoResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getAvatarUrl()
        );
    }
}
