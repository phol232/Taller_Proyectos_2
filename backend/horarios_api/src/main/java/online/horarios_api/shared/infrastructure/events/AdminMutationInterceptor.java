package online.horarios_api.shared.infrastructure.events;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminMutationInterceptor implements HandlerInterceptor {

    private static final Map<String, String> PATH_TO_EVENT = Map.of(
            "/api/courses", "courses.changed",
            "/api/teachers", "teachers.changed",
            "/api/classrooms", "classrooms.changed",
            "/api/students", "students.changed",
            "/api/academic-periods", "academic-periods.changed",
            "/api/facultades", "facultades.changed",
            "/api/carreras", "carreras.changed"
    );

    private final SseEventPublisher publisher;

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        if (ex != null) return;

        String method = request.getMethod();
        if (!isMutation(method)) return;

        int status = response.getStatus();
        if (status < 200 || status >= 300) return;

        String path = request.getRequestURI();
        for (Map.Entry<String, String> entry : PATH_TO_EVENT.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                log.info("AdminMutationInterceptor: {} {} → publish '{}'", method, path, entry.getValue());
                publisher.publish(entry.getValue());
                return;
            }
        }
    }

    private boolean isMutation(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }
}
