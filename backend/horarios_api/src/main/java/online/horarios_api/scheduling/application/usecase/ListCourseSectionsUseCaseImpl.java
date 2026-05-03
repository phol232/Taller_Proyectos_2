package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.CourseSection;
import online.horarios_api.scheduling.domain.port.in.ListCourseSectionsUseCase;
import online.horarios_api.scheduling.domain.port.out.CourseSectionRepository;

import java.util.List;
import java.util.UUID;

public class ListCourseSectionsUseCaseImpl implements ListCourseSectionsUseCase {

    private final CourseSectionRepository repository;

    public ListCourseSectionsUseCaseImpl(CourseSectionRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<CourseSection> listBySchedule(UUID teachingScheduleId) {
        return repository.findByTeachingScheduleId(teachingScheduleId);
    }
}
