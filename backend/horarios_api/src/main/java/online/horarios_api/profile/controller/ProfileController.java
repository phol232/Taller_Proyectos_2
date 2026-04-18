package online.horarios_api.profile.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.profile.dto.ProfileRequest;
import online.horarios_api.profile.dto.ProfileResponse;
import online.horarios_api.profile.service.ProfileService;
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

    private final ProfileService profileService;

    @Operation(summary = "Obtener perfil del usuario autenticado",
               description = "Devuelve el perfil extendido. Si aún no existe, retorna " +
                             "los datos básicos de cuenta con campos de perfil en null.")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfileResponse> getMyProfile(
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @Operation(summary = "Crear o actualizar perfil del usuario autenticado",
               description = "Upsert: crea el perfil si no existe, o lo actualiza. " +
                             "DNI y teléfono deben ser únicos en todo el sistema.")
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfileResponse> upsertMyProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProfileRequest request) {

        UUID userId = UUID.fromString(jwt.getSubject());
        ProfileResponse response = profileService.upsertProfile(userId, request);
        return ResponseEntity.ok(response);
    }
}
