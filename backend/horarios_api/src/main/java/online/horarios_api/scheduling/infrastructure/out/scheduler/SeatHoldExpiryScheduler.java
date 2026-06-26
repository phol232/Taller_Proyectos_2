package online.horarios_api.scheduling.infrastructure.out.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Libera periódicamente los holds de cupo vencidos (estrategia B, Fase 6).
 * La limpieza también es perezosa en las consultas de cupo, así que este job
 * solo evita acumulación; un atraso no produce cupo fantasma.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeatHoldExpiryScheduler {

    private final StudentScheduleRepository repository;

    @Scheduled(fixedDelayString = "PT30S")
    public void expireSeatHolds() {
        try {
            int released = repository.expireSeatHolds();
            if (released > 0) {
                log.debug("seat_holds vencidos liberados: {}", released);
            }
        } catch (Exception ex) {
            log.warn("No se pudieron expirar seat_holds: {}", ex.getMessage());
        }
    }
}
