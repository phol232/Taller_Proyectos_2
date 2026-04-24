package online.horarios_api.user.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.user.domain.port.in.CreateUserUseCase;
import online.horarios_api.user.domain.port.in.FindUserByIdUseCase;
import online.horarios_api.user.domain.port.in.ListUsersUseCase;
import online.horarios_api.user.domain.port.in.SearchUsersByNameUseCase;
import online.horarios_api.user.domain.port.in.UpdateUserStatusUseCase;
import online.horarios_api.user.infrastructure.in.web.dto.CreateUserRequest;
import online.horarios_api.user.infrastructure.in.web.dto.UserResponse;
import online.horarios_api.shared.domain.model.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Gestión y consulta de usuarios del sistema")
public class UserController {

    private final ListUsersUseCase        listUsersUseCase;
    private final FindUserByIdUseCase     findUserByIdUseCase;
    private final SearchUsersByNameUseCase searchUsersByNameUseCase;
    private final CreateUserUseCase       createUserUseCase;
    private final UpdateUserStatusUseCase updateUserStatusUseCase;

    @Operation(summary = "Listar todos los usuarios (paginado)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> listAll(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(listUsersUseCase.listAllUsersPaged(page, pageSize).map(UserResponse::from));
    }

    @Operation(summary = "Crear usuario con email y contraseña")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(UserResponse.from(createUserUseCase.createUser(
                request.email(),
                request.password(),
                request.fullName(),
                request.role(),
                request.active(),
                request.emailVerified()
        )));
    }

    @Operation(summary = "Obtener usuario por ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(UserResponse.from(findUserByIdUseCase.findById(id)));
    }

    @Operation(summary = "Buscar usuarios por nombre (paginado)")
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(searchUsersByNameUseCase.searchByNamePaged(q, page, pageSize).map(UserResponse::from));
    }

    @Operation(summary = "Desactivar usuario")
    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(UserResponse.from(updateUserStatusUseCase.setUserStatus(id, false)));
    }

    @Operation(summary = "Activar usuario")
    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(UserResponse.from(updateUserStatusUseCase.setUserStatus(id, true)));
    }
}
