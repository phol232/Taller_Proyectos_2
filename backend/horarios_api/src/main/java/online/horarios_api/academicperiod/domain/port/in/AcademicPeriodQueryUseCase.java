package online.horarios_api.academicperiod.domain.port.in;

import online.horarios_api.academicperiod.domain.model.AcademicPeriod;

import java.util.List;
import java.util.UUID;

public interface AcademicPeriodQueryUseCase {
    AcademicPeriod getAcademicPeriod(UUID periodId);
    List<AcademicPeriod> listAcademicPeriods();
    List<AcademicPeriod> searchAcademicPeriods(String query);
}
