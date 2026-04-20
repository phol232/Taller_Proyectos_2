package online.horarios_api.user.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import online.horarios_api.user.domain.port.in.FindUserByIdUseCase;
import online.horarios_api.user.domain.port.in.ListUsersUseCase;
import online.horarios_api.user.domain.port.in.SearchUsersByNameUseCase;
import online.horarios_api.user.infrastructure.in.web.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Gestión y consulta de usuarios del sistema")
public class UserController {

    private final ListUsersUseCase        listUsersUseCase;
    private final FindUserByIdUseCase     findUserByIdUseCase;
    private final SearchUsersByNameUseCase searchUsersByNameUseCase;

    @Operation(summary = "Listar todos los usuarios")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> listAll() {
        List<UserResponse> users = listUsersUseCase.listAllUsers().stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @Operation(summary = "Obtener usuario por ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(UserResponse.from(findUserByIdUseCase.findById(id)));
    }

    @Operation(summary = "Buscar usuarios por nombre (búsqueda en tiempo real)")
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> search(@RequestParam String q) {
        List<UserResponse> results = searchUsersByNameUseCase.searchByName(q).stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(results);
    }
}
