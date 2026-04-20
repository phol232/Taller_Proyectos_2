package online.horarios_api.user.infrastructure.out.security;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.security.AuthenticatedUserDetails;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class UserDetailsServiceAdapter implements UserDetailsService {

    private final UserPort userPort;

    @Override
    @Transactional(readOnly = true)
    public @NonNull UserDetails loadUserByUsername(@NonNull String email) throws UsernameNotFoundException {
        User user = userPort.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (user.getPasswordHash() == null) {
            throw new UsernameNotFoundException("Esta cuenta usa inicio de sesión con Google");
        }

        return new AuthenticatedUserDetails(
                new UserInfo(user.getId(), user.getEmail(), user.getFullName(),
                            user.getRole().name(), user.getAvatarUrl()),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                user.isActive()
        );
    }
}
