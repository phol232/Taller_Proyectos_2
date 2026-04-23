package online.horarios_api.shared.infrastructure.events;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
@Tag(name = "Eventos Admin", description = "Server-Sent Events para sincronización de CRUDs admin")
public class AdminEventsController {

    private final SseEventPublisher publisher;

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Stream SSE con eventos de cambio en recursos admin")
    public SseEmitter stream() {
        return publisher.subscribe();
    }
}
