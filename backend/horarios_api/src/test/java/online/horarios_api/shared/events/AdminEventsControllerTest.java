package online.horarios_api.shared.events;

import online.horarios_api.shared.infrastructure.events.AdminEventsController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AdminEventsController")
class AdminEventsControllerTest {

    @Test
    @DisplayName("el stream SSE permite admin y coordinator")
    void streamAllowsAdminAndCoordinator() throws NoSuchMethodException {
        PreAuthorize annotation = AdminEventsController.class
                .getMethod("stream", jakarta.servlet.http.HttpServletResponse.class)
                .getAnnotation(PreAuthorize.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo("hasAnyRole('ADMIN', 'COORDINATOR')");
    }
}
