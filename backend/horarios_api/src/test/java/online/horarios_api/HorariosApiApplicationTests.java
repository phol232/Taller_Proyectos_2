package online.horarios_api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Disabled("Requiere PostgreSQL local configurado para bootstrap completo del contexto")
class HorariosApiApplicationTests {

    @Test
    void contextLoads() {
    }

}
