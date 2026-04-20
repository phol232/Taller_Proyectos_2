package online.horarios_api.shared.infrastructure.security;

import online.horarios_api.shared.domain.model.UserInfo;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class AuthenticatedUserDetails implements UserDetails {

    private final UserInfo userInfo;
    private final String password;
    private final List<GrantedAuthority> authorities;
    private final boolean active;

    public AuthenticatedUserDetails(UserInfo userInfo, String password,
                                    List<GrantedAuthority> authorities, boolean active) {
        this.userInfo = userInfo;
        this.password = password;
        this.authorities = authorities;
        this.active = active;
    }

    public UserInfo getUserInfo() {
        return userInfo;
    }

    @Override
    public String getUsername() {
        return userInfo.id().toString();
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
