package online.horarios_api.profile.service;

import online.horarios_api.profile.application.usecase.ProfileService;
import online.horarios_api.profile.domain.exception.DuplicateProfileFieldException;
import online.horarios_api.profile.domain.model.Profile;
import online.horarios_api.profile.domain.model.ProfileData;
import online.horarios_api.profile.domain.model.ProfileInfo;
import online.horarios_api.profile.domain.model.SexType;
import online.horarios_api.profile.domain.port.out.ProfilePort;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProfileService — lógica de negocio")
class ProfileServiceTest {

    @Mock private ProfilePort profilePort;
    @Mock private UserReadPort userReadPort;

    @InjectMocks
    private ProfileService service;

    @Test
    @DisplayName("getProfile: sin perfil existente → devuelve respuesta vacía")
    void getProfile_withoutProfile_returnsEmptyResponse() {
        UUID userId = UUID.randomUUID();
        UserInfo user = buildUserInfo(userId);
        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.of(user));
        when(profilePort.findByUserId(userId)).thenReturn(Optional.empty());

        ProfileInfo result = service.getProfile(userId);

        assertThat(result.userId()).isEqualTo(userId);
        assertThat(result.email()).isEqualTo(user.email());
        assertThat(result.dni()).isNull();
        assertThat(result.phone()).isNull();
    }

    @Test
    @DisplayName("upsertProfile: crea perfil y normaliza datos")
    void upsertProfile_createsProfileAndUpdatesData() {
        UUID userId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
        UserInfo user = buildUserInfo(userId);
        ProfileData command = new ProfileData(" 12345678 ", " 999888777 ", SexType.MALE, 22, null, null);

        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.of(user));
        when(profilePort.findByUserId(userId)).thenReturn(Optional.empty());
        when(profilePort.save(any(Profile.class))).thenAnswer(invocation -> {
            Profile profile = invocation.getArgument(0);
            return new Profile(profileId, profile.getUserId(),
                    profile.getDni(), profile.getPhone(), profile.getSex(),
                    profile.getAge(), profile.getFacultadId(), profile.getCarreraId(),
                    null, null);
        });

        ProfileInfo result = service.upsertProfile(userId, command);

        assertThat(result.id()).isEqualTo(profileId);
        assertThat(result.userId()).isEqualTo(userId);
        assertThat(result.dni()).isEqualTo("12345678");
        assertThat(result.phone()).isEqualTo("999888777");
        assertThat(result.sex()).isEqualTo(SexType.MALE);
        assertThat(result.age()).isEqualTo(22);
    }

    @Test
    @DisplayName("upsertProfile: DNI duplicado → lanza DuplicateProfileFieldException")
    void upsertProfile_duplicateDni_throwsConflict() {
        UUID userId = UUID.randomUUID();
        UserInfo user = buildUserInfo(userId);
        ProfileData command = new ProfileData("12345678", null, null, null, null, null);

        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.of(user));
        when(profilePort.existsByDniAndUserIdNot(eq("12345678"), eq(userId))).thenReturn(true);

        assertThatThrownBy(() -> service.upsertProfile(userId, command))
                .isInstanceOf(DuplicateProfileFieldException.class);
    }

    private UserInfo buildUserInfo(UUID userId) {
        return new UserInfo(userId, "user@continental.edu.pe", "Usuario Test", "STUDENT", null);
    }
}
