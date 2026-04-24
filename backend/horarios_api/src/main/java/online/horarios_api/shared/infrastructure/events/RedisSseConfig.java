package online.horarios_api.shared.infrastructure.events;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.nio.charset.StandardCharsets;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class RedisSseConfig {

    private final RedisConnectionFactory connectionFactory;
    private final SseEventPublisher publisher;

    @PostConstruct
    void logBoot() {
        log.info("RedisSseConfig cargada. ConnectionFactory={}", connectionFactory.getClass().getSimpleName());
    }

    @Bean
    public RedisMessageListenerContainer adminEventsListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        MessageListener listener = (message, pattern) -> {
            String eventName = new String(message.getBody(), StandardCharsets.UTF_8);
            log.info("SSE Redis listener recibió: '{}'", eventName);
            publisher.dispatchLocal(eventName);
        };

        container.addMessageListener(listener, new ChannelTopic(SseEventPublisher.CHANNEL));
        log.info("Subscriber Redis SSE registrado en canal '{}'", SseEventPublisher.CHANNEL);
        return container;
    }
}
