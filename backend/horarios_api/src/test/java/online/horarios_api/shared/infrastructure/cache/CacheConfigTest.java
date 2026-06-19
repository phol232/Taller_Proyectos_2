package online.horarios_api.shared.infrastructure.cache;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("CacheConfig — construcción del RedisCacheManager por niveles de TTL")
class CacheConfigTest {

    @Mock
    private RedisConnectionFactory connectionFactory;

    @Test
    @DisplayName("cacheManager: construye el manager con todas las cachés configuradas")
    void cacheManager_buildsWithAllCacheNames() {
        CacheConfig config = new CacheConfig(1800, 300, 60, 2);

        RedisCacheManager manager = config.cacheManager(connectionFactory);
        manager.afterPropertiesSet();

        assertThat(manager).isNotNull();
        assertThat(manager.getCacheNames()).contains(
                CacheNames.CATALOG_FACULTADES, CacheNames.CATALOG_CARRERAS,
                CacheNames.TIME_SLOTS, CacheNames.ACADEMIC_PERIODS, CacheNames.CLASSROOMS,
                CacheNames.COURSES, CacheNames.TEACHERS, CacheNames.STUDENTS, CacheNames.USERS,
                CacheNames.SCHEDULE_OPTIONS, CacheNames.TIMETABLE,
                CacheNames.STUDENT_PENDING_COURSES, CacheNames.STUDENT_SCHEDULE,
                CacheNames.RUN_STATUS
        );
    }
}
