package online.horarios_api.shared.infrastructure.events;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.nio.charset.StandardCharsets;

/**
 * Wires a Redis pub/sub subscriber that forwards fan-out events to the local
 * {@link SseEventPublisher} so every backend node delivers to its connected clients.
 */
@Configuration
@ConditionalOnBean(RedisConnectionFactory.class)
@Slf4j
public class RedisSseConfig {

    @Bean
    public RedisMessageListenerContainer adminEventsListenerContainer(
            RedisConnectionFactory connectionFactory,
            SseEventPublisher publisher) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        MessageListener listener = (message, pattern) -> {
            String eventName = new String(message.getBody(), StandardCharsets.UTF_8);
            log.debug("Recibido evento Redis '{}'", eventName);
            publisher.dispatchLocal(eventName);
        };

        container.addMessageListener(listener, new ChannelTopic(SseEventPublisher.CHANNEL));
        log.info("Subscriber Redis SSE iniciado en canal '{}'", SseEventPublisher.CHANNEL);
        return container;
    }
}
