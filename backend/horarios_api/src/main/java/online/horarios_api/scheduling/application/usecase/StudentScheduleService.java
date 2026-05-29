package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleUseCase;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class StudentScheduleService implements StudentScheduleUseCase {

    private final StudentScheduleRepository repository;

    public StudentScheduleService(StudentScheduleRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId) {
        if (studentId == null || academicPeriodId == null) {
            throw new BadRequestException("El estudiante y el período son obligatorios.");
        }
        return repository.listPendingCourses(studentId, academicPeriodId);
    }

    @Override
    public Optional<ActiveStudentSchedule> getActiveSchedule(UUID studentId, UUID academicPeriodId) {
        if (studentId == null || academicPeriodId == null) {
            throw new BadRequestException("El estudiante y el período son obligatorios.");
        }
        return repository.findActiveSchedule(studentId, academicPeriodId);
    }
}
