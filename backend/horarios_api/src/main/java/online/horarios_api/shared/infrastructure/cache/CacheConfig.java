package online.horarios_api.shared.infrastructure.cache;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
@ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true", matchIfMissing = true)
public class CacheConfig {

    private final long referenceTtl;
    private final long listingTtl;
    private final long derivedTtl;
    private final long runStatusTtl;

    public CacheConfig(
            @Value("${app.cache.ttl.reference-seconds:1800}") long referenceTtl,
            @Value("${app.cache.ttl.listing-seconds:300}") long listingTtl,
            @Value("${app.cache.ttl.derived-seconds:60}") long derivedTtl,
            @Value("${app.cache.ttl.run-status-seconds:2}") long runStatusTtl) {
        this.referenceTtl = referenceTtl;
        this.listingTtl = listingTtl;
        this.derivedTtl = derivedTtl;
        this.runStatusTtl = runStatusTtl;
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer()))
                .prefixCacheNameWith("planneruc:cache:");

        Map<String, RedisCacheConfiguration> perCache = new HashMap<>();

        // Nivel 1 — referencia (TTL largo)
        putAll(perCache, base.entryTtl(Duration.ofSeconds(referenceTtl)),
                CacheNames.CATALOG_FACULTADES, CacheNames.CATALOG_CARRERAS,
                CacheNames.TIME_SLOTS, CacheNames.ACADEMIC_PERIODS, CacheNames.CLASSROOMS);

        // Nivel 2 — listados (TTL medio)
        putAll(perCache, base.entryTtl(Duration.ofSeconds(listingTtl)),
                CacheNames.COURSES, CacheNames.TEACHERS, CacheNames.STUDENTS, CacheNames.USERS);

        // Nivel 3 — derivados (TTL corto)
        putAll(perCache, base.entryTtl(Duration.ofSeconds(derivedTtl)),
                CacheNames.SCHEDULE_OPTIONS, CacheNames.TIMETABLE,
                CacheNames.STUDENT_PENDING_COURSES, CacheNames.STUDENT_SCHEDULE);

        // Estado de corrida — TTL muy corto (anti-polling)
        perCache.put(CacheNames.RUN_STATUS, base.entryTtl(Duration.ofSeconds(runStatusTtl)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(base.entryTtl(Duration.ofSeconds(listingTtl)))
                .withInitialCacheConfigurations(perCache)
                .build();
    }

    @SuppressWarnings({"deprecation", "removal"})
    private static GenericJackson2JsonRedisSerializer valueSerializer() {
        ObjectMapper mapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .activateDefaultTyping(
                        BasicPolymorphicTypeValidator.builder().allowIfBaseType(Object.class).build(),
                        ObjectMapper.DefaultTyping.EVERYTHING,
                        JsonTypeInfo.As.PROPERTY)
                .build();
        return new GenericJackson2JsonRedisSerializer(mapper);
    }

    private static void putAll(Map<String, RedisCacheConfiguration> target,
                               RedisCacheConfiguration config,
                               String... names) {
        for (String name : names) {
            target.put(name, config);
        }
    }
}
