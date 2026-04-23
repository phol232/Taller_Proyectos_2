package online.horarios_api.academicperiod.domain.port.in;

import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;

import java.util.UUID;

public interface AcademicPeriodCommandUseCase {
    AcademicPeriod createAcademicPeriod(AcademicPeriodData command);
    AcademicPeriod updateAcademicPeriod(UUID periodId, AcademicPeriodData command);
    void deactivateAcademicPeriod(UUID periodId);
    void deleteAcademicPeriod(UUID periodId);
}
