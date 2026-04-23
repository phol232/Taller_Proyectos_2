package online.horarios_api.auth.infrastructure.out.security;

import online.horarios_api.auth.domain.port.out.AuthenticationPort;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.security.AuthenticatedUserDetails;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationAdapter implements AuthenticationPort {

    private final AuthenticationManager authenticationManager;

    public AuthenticationAdapter(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    @Override
    public UserInfo authenticate(String email, String password) {
        Authentication result;
        try {
            result = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
        } catch (BadCredentialsException ex) {
            throw new UnauthorizedException("Credenciales inválidas");
        }

        Object rawPrincipal = result.getPrincipal();
        if (rawPrincipal == null || !(rawPrincipal instanceof AuthenticatedUserDetails principal)) {
            throw new UnauthorizedException("Credenciales inválidas");
        }
        UserInfo userInfo = principal.getUserInfo();
        if (userInfo == null) {
            throw new UnauthorizedException("Credenciales inválidas");
        }
        return userInfo;
    }
}
