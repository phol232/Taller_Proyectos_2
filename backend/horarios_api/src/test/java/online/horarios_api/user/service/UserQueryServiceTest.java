package online.horarios_api.user.service;

import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.user.application.usecase.UserQueryService;
import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserQueryService — consultas de usuarios")
class UserQueryServiceTest {

    @Mock
    private UserPort userPort;

    private UserQueryService service;

    @BeforeEach
    void setUp() {
        service = new UserQueryService(userPort);
    }

    private User sampleUser(UUID id) {
        return new User(id, "user@continental.edu.pe", null, "Usuario Test",
                Role.STUDENT, true, true, null, null, null);
    }

    @Test
    @DisplayName("listAllUsers delega en userPort.findAll")
    void listAllUsers_delegates() {
        List<User> users = List.of(sampleUser(UUID.randomUUID()));
        when(userPort.findAll()).thenReturn(users);

        assertThat(service.listAllUsers()).isEqualTo(users);
        verify(userPort).findAll();
    }

    @Test
    @DisplayName("listAllUsersPaged delega en userPort.findAllPaged")
    void listAllUsersPaged_delegates() {
        Page<User> page = Page.of(List.of(sampleUser(UUID.randomUUID())), 1, 10, 1);
        when(userPort.findAllPaged(1, 10)).thenReturn(page);

        assertThat(service.listAllUsersPaged(1, 10)).isEqualTo(page);
        verify(userPort).findAllPaged(1, 10);
    }

    @Test
    @DisplayName("findById devuelve usuario existente")
    void findById_found() {
        UUID id = UUID.randomUUID();
        User user = sampleUser(id);
        when(userPort.findById(id)).thenReturn(Optional.of(user));

        assertThat(service.findById(id)).isEqualTo(user);
    }

    @Test
    @DisplayName("findById lanza NotFoundException cuando no existe")
    void findById_notFound() {
        UUID id = UUID.randomUUID();
        when(userPort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Usuario no encontrado");
    }

    @Test
    @DisplayName("searchByName con query vacía lista todos")
    void searchByName_blankQuery_listsAll() {
        List<User> users = List.of(sampleUser(UUID.randomUUID()));
        when(userPort.findAll()).thenReturn(users);

        assertThat(service.searchByName("   ")).isEqualTo(users);
        verify(userPort).findAll();
    }

    @Test
    @DisplayName("searchByName con texto delega en findByFullNameContaining")
    void searchByName_withQuery_searches() {
        List<User> users = List.of(sampleUser(UUID.randomUUID()));
        when(userPort.findByFullNameContaining("Ana")).thenReturn(users);

        assertThat(service.searchByName("  Ana ")).isEqualTo(users);
        verify(userPort).findByFullNameContaining("Ana");
    }

    @Test
    @DisplayName("searchByNamePaged con query vacía pagina todos")
    void searchByNamePaged_blankQuery_listsPaged() {
        Page<User> page = Page.of(List.of(sampleUser(UUID.randomUUID())), 2, 5, 12);
        when(userPort.findAllPaged(2, 5)).thenReturn(page);

        assertThat(service.searchByNamePaged(null, 2, 5)).isEqualTo(page);
        verify(userPort).findAllPaged(2, 5);
    }

    @Test
    @DisplayName("searchByNamePaged con texto delega en findByFullNameContainingPaged")
    void searchByNamePaged_withQuery_searchesPaged() {
        Page<User> page = Page.of(List.of(sampleUser(UUID.randomUUID())), 1, 20, 3);
        when(userPort.findByFullNameContainingPaged("Luis", 1, 20)).thenReturn(page);

        assertThat(service.searchByNamePaged("Luis", 1, 20)).isEqualTo(page);
        verify(userPort).findByFullNameContainingPaged("Luis", 1, 20);
    }
}
