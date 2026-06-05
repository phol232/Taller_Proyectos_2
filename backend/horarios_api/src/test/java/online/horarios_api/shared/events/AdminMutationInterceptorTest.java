package online.horarios_api.shared.events;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import online.horarios_api.shared.infrastructure.events.AdminMutationInterceptor;
import online.horarios_api.shared.infrastructure.events.SseEventPublisher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.CacheManager;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("AdminMutationInterceptor")
class AdminMutationInterceptorTest {

    private final SseEventPublisher publisher = mock(SseEventPublisher.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<CacheManager> cacheManagerProvider = mock(ObjectProvider.class);
    private final AdminMutationInterceptor interceptor =
            new AdminMutationInterceptor(publisher, cacheManagerProvider);

    @Test
    @DisplayName("publica schedules.changed para mutaciones reales del constructor de horarios")
    void publishesSchedulesChangedForScheduleBuilderMutations() {
        HttpServletRequest request = request("POST", "/api/schedules/schedule-1/assignments");
        HttpServletResponse response = response(200);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(publisher).publish("schedules.changed");
    }

    @Test
    @DisplayName("publica schedules.changed al eliminar franjas del constructor")
    void publishesSchedulesChangedForSlotDeletion() {
        HttpServletRequest request = request("DELETE", "/api/schedules/slots/slot-1");
        HttpServletResponse response = response(200);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(publisher).publish("schedules.changed");
    }

    @Test
    @DisplayName("no publica eventos para validar franjas porque no cambia estado")
    void doesNotPublishForScheduleValidation() {
        HttpServletRequest request = request("POST", "/api/schedules/schedule-1/validate");
        HttpServletResponse response = response(200);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(publisher, never()).publish("schedules.changed");
    }

    @Test
    @DisplayName("no publica si la respuesta no fue exitosa")
    void doesNotPublishForFailedMutations() {
        HttpServletRequest request = request("POST", "/api/schedules/schedule-1/assignments");
        HttpServletResponse response = response(400);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(publisher, never()).publish("schedules.changed");
    }

    @Test
    @DisplayName("no publica para lecturas")
    void doesNotPublishForReads() {
        HttpServletRequest request = request("GET", "/api/schedules/schedule-1/assignments");
        HttpServletResponse response = response(200);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(publisher, never()).publish("schedules.changed");
    }

    private static HttpServletRequest request(String method, String path) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn(method);
        when(request.getRequestURI()).thenReturn(path);
        return request;
    }

    private static HttpServletResponse response(int status) {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getStatus()).thenReturn(status);
        return response;
    }
}
