package online.horarios_api.user.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.ConflictException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper;
import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import online.horarios_api.user.infrastructure.out.persistence.entity.OAuth2LinkedAccountEntity;
import online.horarios_api.user.infrastructure.out.persistence.entity.UserEntity;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserPort {

    private final UserJpaRepository                userJpaRepository;
    private final OAuth2LinkedAccountJpaRepository oauth2JpaRepository;
    private final JdbcTemplate                     jdbcTemplate;

    private static final RowMapper<User> USER_ROW_MAPPER = (rs, rowNum) -> new User(
            rs.getObject("id", UUID.class),
            rs.getString("email"),
            rs.getString("password_hash"),
            rs.getString("full_name"),
            Role.valueOf(rs.getString("role")),
            rs.getBoolean("is_active"),
            rs.getBoolean("email_verified"),
            rs.getString("avatar_url"),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant()
    );

    @Override
    public Optional<User> findById(UUID id) {
        return userJpaRepository.findById(id).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userJpaRepository.findByEmail(email).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmailAndActiveTrue(String email) {
        return userJpaRepository.findByEmailAndActiveTrue(email).map(UserEntity::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = UserEntity.fromDomain(user);
        User saved = userJpaRepository.save(entity).toDomain();
        jdbcTemplate.queryForObject("SELECT fn_provision_user_academic_identity(?)", Object.class, saved.getId());
        return saved;
    }

    @Override
    public User create(User user) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_user(?, ?, ?, ?::user_role, ?, ?)",
                    USER_ROW_MAPPER,
                    user.getEmail(),
                    user.getPasswordHash(),
                    user.getFullName(),
                    user.getRole().name(),
                    user.isActive(),
                    user.isEmailVerified()
            );
        } catch (DataAccessException ex) {
            ConflictException conflict = JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw new DuplicateFieldException("email", "Ya existe un usuario con ese correo.");
            }
            throw ex;
        }
    }

    @Override
    public User setAccessStatus(UUID userId, boolean active) {
        return jdbcTemplate.queryForObject(
                "SELECT * FROM fn_set_user_access_status(?, ?)",
                USER_ROW_MAPPER,
                userId,
                active
        );
    }

    @Override
    public Optional<OAuth2LinkedAccount> findOAuth2Account(String provider, String providerSubject) {
        return oauth2JpaRepository.findByProviderAndProviderSubject(provider, providerSubject)
                .map(OAuth2LinkedAccountEntity::toDomain);
    }

    @Override
    public OAuth2LinkedAccount saveOAuth2Account(OAuth2LinkedAccount account) {
        OAuth2LinkedAccountEntity entity = OAuth2LinkedAccountEntity.fromDomain(account);
        return oauth2JpaRepository.save(entity).toDomain();
    }

    @Override
    public List<User> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_users()", USER_ROW_MAPPER);
    }

    @Override
    public List<User> findByFullNameContaining(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_users_by_name(?)", USER_ROW_MAPPER, query);
    }

    @Override
    public Page<User> findAllPaged(int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        long[] total = {0L};
        List<User> raw = jdbcTemplate.query(
                "SELECT * FROM fn_list_users_paged(?, ?)",
                (rs, rowNum) -> {
                    if (rowNum == 0) total[0] = rs.getLong("total_count");
                    return USER_ROW_MAPPER.mapRow(rs, rowNum);
                },
                safePage, safeSize
        );
        long totalCount = raw.isEmpty() ? 0L : total[0];
        return Page.of(raw, safePage, safeSize, totalCount);
    }

    @Override
    public Page<User> findByFullNameContainingPaged(String query, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        long[] total = {0L};
        List<User> raw = jdbcTemplate.query(
                "SELECT * FROM fn_search_users_paged(?, ?, ?)",
                (rs, rowNum) -> {
                    if (rowNum == 0) total[0] = rs.getLong("total_count");
                    return USER_ROW_MAPPER.mapRow(rs, rowNum);
                },
                query, safePage, safeSize
        );
        long totalCount = raw.isEmpty() ? 0L : total[0];
        return Page.of(raw, safePage, safeSize, totalCount);
    }
}
