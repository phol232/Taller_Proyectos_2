package online.horarios_api.shared.infrastructure.events;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.shared.infrastructure.cache.CacheNames;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class AdminMutationInterceptor implements HandlerInterceptor {

    private static final String SCHEDULE_VALIDATE_SUFFIX = "/validate";

    /** path → (evento SSE, cachés a invalidar). */
    private record Mutation(String event, List<String> caches) {
    }

    private static final Map<String, Mutation> PATH_TO_MUTATION = Map.of(
            "/api/courses", new Mutation("courses.changed", List.of(CacheNames.COURSES)),
            "/api/teachers", new Mutation("teachers.changed", List.of(CacheNames.TEACHERS)),
            "/api/classrooms", new Mutation("classrooms.changed", List.of(CacheNames.CLASSROOMS)),
            "/api/students", new Mutation("students.changed", List.of(CacheNames.STUDENTS)),
            "/api/academic-periods", new Mutation("academic-periods.changed", List.of(CacheNames.ACADEMIC_PERIODS)),
            "/api/facultades", new Mutation("facultades.changed",
                    List.of(CacheNames.CATALOG_FACULTADES, CacheNames.CATALOG_CARRERAS)),
            "/api/carreras", new Mutation("carreras.changed", List.of(CacheNames.CATALOG_CARRERAS)),
            "/api/schedules", new Mutation("schedules.changed",
                    List.of(CacheNames.SCHEDULE_OPTIONS, CacheNames.RUN_STATUS, CacheNames.TIMETABLE))
    );

    private final SseEventPublisher publisher;
    private final ObjectProvider<CacheManager> cacheManagerProvider;

    public AdminMutationInterceptor(SseEventPublisher publisher,
                                    ObjectProvider<CacheManager> cacheManagerProvider) {
        this.publisher = publisher;
        this.cacheManagerProvider = cacheManagerProvider;
    }

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
        if (isReadOnlyMutationEndpoint(path)) return;

        for (Map.Entry<String, Mutation> entry : PATH_TO_MUTATION.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                Mutation mutation = entry.getValue();
                // 1. Invalidar caché ANTES de notificar para que el refetch lea datos frescos.
                evictCaches(mutation.caches());
                // 2. Notificar a los clientes suscritos.
                log.info("AdminMutationInterceptor: {} {} → evict {} + publish '{}'",
                        method, path, mutation.caches(), mutation.event());
                publisher.publish(mutation.event());
                return;
            }
        }
    }

    private void evictCaches(List<String> cacheNames) {
        CacheManager cacheManager = cacheManagerProvider.getIfAvailable();
        if (cacheManager == null) return; // caché desactivada (app.cache.enabled=false)
        for (String name : cacheNames) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        }
    }

    private boolean isMutation(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }

    private boolean isReadOnlyMutationEndpoint(String path) {
        return path != null
                && path.startsWith("/api/schedules/")
                && path.endsWith(SCHEDULE_VALIDATE_SUFFIX);
    }
}
