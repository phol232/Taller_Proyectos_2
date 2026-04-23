package online.horarios_api.academicperiod.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodCommandUseCase;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodQueryUseCase;
import online.horarios_api.academicperiod.domain.port.out.AcademicPeriodPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RequiredArgsConstructor
public class AcademicPeriodService implements AcademicPeriodCommandUseCase, AcademicPeriodQueryUseCase {

    private static final Set<String> ALLOWED_STATUSES = Set.of("PLANNING", "ACTIVE", "CLOSED");

    private final AcademicPeriodPort academicPeriodPort;

    @Override
    @Transactional
    public AcademicPeriod createAcademicPeriod(AcademicPeriodData command) {
        return academicPeriodPort.create(normalize(command));
    }

    @Override
    @Transactional
    public AcademicPeriod updateAcademicPeriod(UUID periodId, AcademicPeriodData command) {
        ensureExists(periodId);
        return academicPeriodPort.update(periodId, normalize(command));
    }

    @Override
    @Transactional
    public void deactivateAcademicPeriod(UUID periodId) {
        ensureExists(periodId);
        academicPeriodPort.deactivate(periodId);
    }

    @Override
    @Transactional
    public void deleteAcademicPeriod(UUID periodId) {
        ensureExists(periodId);
        academicPeriodPort.delete(periodId);
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicPeriod getAcademicPeriod(UUID periodId) {
        return ensureExists(periodId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicPeriod> listAcademicPeriods() {
        return academicPeriodPort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicPeriod> searchAcademicPeriods(String query) {
        if (query == null || query.isBlank()) {
            return academicPeriodPort.findAll();
        }
        return academicPeriodPort.search(query.trim());
    }

    private AcademicPeriod ensureExists(UUID periodId) {
        return academicPeriodPort.findById(periodId)
                .orElseThrow(() -> new NotFoundException("Período académico no encontrado."));
    }

    private AcademicPeriodData normalize(AcademicPeriodData command) {
        if (command.startsAt() == null || command.endsAt() == null) {
            throw new BadRequestException("Las fechas de inicio y fin son obligatorias.");
        }
        if (command.endsAt().isBefore(command.startsAt())) {
            throw new BadRequestException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
        int maxCredits = command.maxStudentCredits() == null ? 22 : command.maxStudentCredits();
        if (maxCredits <= 0) {
            throw new BadRequestException("El máximo de créditos debe ser mayor a 0.");
        }
        String status = requireText(command.status(), "El estado del período es obligatorio.")
                .toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new BadRequestException("El estado del período no es válido.");
        }
        return new AcademicPeriodData(
                requireText(command.code(), "El código del período es obligatorio.").toUpperCase(Locale.ROOT),
                requireText(command.name(), "El nombre del período es obligatorio."),
                command.startsAt(),
                command.endsAt(),
                status,
                maxCredits
        );
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }
}
