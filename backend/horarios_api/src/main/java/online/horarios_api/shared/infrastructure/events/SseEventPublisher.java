package online.horarios_api.shared.infrastructure.events;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Manages SSE connections and publishes admin events to all subscribers.
 *
 * <p>Multi-instance aware:
 * <ul>
 *   <li>If a {@link StringRedisTemplate} bean is available, {@link #publish(String)}
 *       fans out the event via Redis pub/sub so every node (including this one,
 *       via its own subscriber) delivers the event to its local SSE emitters.</li>
 *   <li>If Redis is not configured, it falls back to local-only delivery.</li>
 * </ul>
 *
 * <p>A periodic heartbeat comment is sent every 20 seconds to keep connections alive
 * through proxies and to detect stale clients early.
 */
@Component
@Slf4j
public class SseEventPublisher {

    public static final String CHANNEL = "admin-events";

    private static final long TIMEOUT_MS = 30L * 60L * 1000L; // 30 min
    private static final long HEARTBEAT_INTERVAL_SECONDS = 20L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final ObjectProvider<StringRedisTemplate> redisTemplateProvider;
    private final ScheduledExecutorService heartbeatScheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "sse-heartbeat");
                t.setDaemon(true);
                return t;
            });

    public SseEventPublisher(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplateProvider = redisTemplateProvider;
    }

    @PostConstruct
    void startHeartbeat() {
        heartbeatScheduler.scheduleAtFixedRate(
                this::sendHeartbeat,
                HEARTBEAT_INTERVAL_SECONDS,
                HEARTBEAT_INTERVAL_SECONDS,
                TimeUnit.SECONDS
        );
        log.info("SSE heartbeat iniciado cada {}s", HEARTBEAT_INTERVAL_SECONDS);
    }

    @PreDestroy
    void stopHeartbeat() {
        heartbeatScheduler.shutdownNow();
    }

    private void sendHeartbeat() {
        if (emitters.isEmpty()) return;
        // SSE comment lines (": ...") are ignored by clients but flush the connection
        // through proxies that buffer chunked responses.
        SseEmitter.SseEventBuilder heartbeat = SseEmitter.event().comment("heartbeat");
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(heartbeat);
            } catch (IOException | IllegalStateException ex) {
                emitters.remove(emitter);
                log.debug("Emitter removido en heartbeat: {}", ex.getMessage());
            }
        }
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.add(emitter);

        emitter.onCompletion(() -> {
            emitters.remove(emitter);
            log.debug("SSE emitter completado. Activos: {}", emitters.size());
        });
        emitter.onTimeout(() -> {
            emitters.remove(emitter);
            emitter.complete();
            log.debug("SSE emitter timeout. Activos: {}", emitters.size());
        });
        emitter.onError(ex -> {
            emitters.remove(emitter);
            log.debug("SSE emitter error: {}", ex.getMessage());
        });

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ex) {
            emitters.remove(emitter);
            log.warn("Fallo al enviar evento de conexión SSE: {}", ex.getMessage());
        }

        log.info("SSE subscriber agregado. Activos: {}", emitters.size());
        return emitter;
    }

    /**
     * Publishes an event. Uses Redis pub/sub when available so every node dispatches
     * to its local emitters; otherwise dispatches only to this node's emitters.
     */
    public void publish(String eventName) {
        StringRedisTemplate tpl = redisTemplateProvider.getIfAvailable();
        if (tpl != null) {
            try {
                tpl.convertAndSend(CHANNEL, eventName);
                return;
            } catch (Exception ex) {
                log.warn("Fallo Redis publish '{}', fallback local: {}", eventName, ex.getMessage());
            }
        }
        dispatchLocal(eventName);
    }

    /**
     * Delivers an event to every SSE emitter connected to THIS instance.
     * Invoked directly in single-node mode and from the Redis listener in multi-node mode.
     */
    public void dispatchLocal(String eventName) {
        if (emitters.isEmpty()) {
            return;
        }
        log.debug("Dispatch local SSE '{}' a {} subscriber(s)", eventName, emitters.size());
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(eventName));
            } catch (IOException | IllegalStateException ex) {
                emitters.remove(emitter);
                log.debug("Emitter removido por fallo de envío: {}", ex.getMessage());
            }
        }
    }
}
