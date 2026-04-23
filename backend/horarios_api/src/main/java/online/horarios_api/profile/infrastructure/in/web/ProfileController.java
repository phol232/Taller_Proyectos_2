package online.horarios_api.profile.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.profile.domain.model.ProfileData;
import online.horarios_api.profile.domain.model.ProfileInfo;
import online.horarios_api.profile.domain.port.in.GetProfileUseCase;
import online.horarios_api.profile.domain.port.in.UpsertProfileUseCase;
import online.horarios_api.profile.infrastructure.in.web.dto.ProfileRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Perfil", description = "Gestión del perfil de usuario autenticado")
public class ProfileController {

    private final GetProfileUseCase    getProfileUseCase;
    private final UpsertProfileUseCase upsertProfileUseCase;

    @Operation(summary = "Obtener perfil del usuario autenticado",
               description = "Devuelve el perfil extendido. Si aún no existe, retorna " +
                             "los datos básicos de cuenta con campos de perfil en null.")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfileInfo> getMyProfile(
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(getProfileUseCase.getProfile(userId));
    }

    @Operation(summary = "Crear o actualizar perfil del usuario autenticado",
               description = "Upsert: crea el perfil si no existe, o lo actualiza. " +
                             "DNI y teléfono deben ser únicos en todo el sistema.")
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfileInfo> upsertMyProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProfileRequest request) {

        UUID userId = UUID.fromString(jwt.getSubject());
        ProfileData command = new ProfileData(
                request.dni(),
                request.phone(),
                request.sex(),
                request.age(),
                request.facultadId(),
                request.carreraId()
        );
        return ResponseEntity.ok(upsertProfileUseCase.upsertProfile(userId, command));
    }
}
