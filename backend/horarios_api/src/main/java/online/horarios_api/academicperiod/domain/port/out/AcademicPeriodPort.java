package online.horarios_api.academicperiod.domain.port.out;

import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicPeriodPort {
    AcademicPeriod create(AcademicPeriodData command);
    AcademicPeriod update(UUID periodId, AcademicPeriodData command);
    Optional<AcademicPeriod> findById(UUID periodId);
    List<AcademicPeriod> findAll();
    List<AcademicPeriod> search(String query);
    void deactivate(UUID periodId);
    void delete(UUID periodId);
}
