package online.horarios_api.user.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import online.horarios_api.user.infrastructure.out.persistence.entity.UserEntity;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserReadAdapter implements UserReadPort {

    private final UserJpaRepository userJpaRepository;

    @Override
    public Optional<UserInfo> findUserInfoById(UUID id) {
        return userJpaRepository.findById(id).map(this::toUserInfo);
    }

    @Override
    public Optional<UserInfo> findActiveUserInfoByEmail(String email) {
        return userJpaRepository.findByEmailAndActiveTrue(email).map(this::toUserInfo);
    }

    private UserInfo toUserInfo(UserEntity entity) {
        return new UserInfo(
                entity.getId(),
                entity.getEmail(),
                entity.getFullName(),
                entity.getRole().name(),
                entity.getAvatarUrl()
        );
    }
}
