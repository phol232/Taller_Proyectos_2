package online.horarios_api.courseoffering.service;

import online.horarios_api.courseoffering.application.usecase.CourseOfferingService;
import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;
import online.horarios_api.courseoffering.domain.model.CourseSectionData;
import online.horarios_api.courseoffering.domain.model.SectionTeacherCandidate;
import online.horarios_api.courseoffering.domain.port.out.CourseOfferingPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseOfferingService — lógica de negocio")
class CourseOfferingServiceTest {

    @Mock
    private CourseOfferingPort courseOfferingPort;

    @InjectMocks
    private CourseOfferingService service;

    @Test
    @DisplayName("createCourseOffering: normaliza sección y deduplica candidatos")
    void createCourseOffering_normalizesPayload() {
        when(courseOfferingPort.create(any())).thenAnswer(invocation -> {
            CourseOfferingData data = invocation.getArgument(0);
            return new CourseOffering(UUID.randomUUID(), data.academicPeriodId(), data.courseId(), data.expectedEnrollment(),
                    data.status(), List.of(), Instant.now(), Instant.now());
        });

        UUID periodId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        service.createCourseOffering(new CourseOfferingData(
                periodId,
                courseId,
                25,
                "draft",
                List.of(new CourseSectionData(
                        " a ",
                        30,
                        "active",
                        List.of(
                                new SectionTeacherCandidate(teacherId, 1.0),
                                new SectionTeacherCandidate(teacherId, 2.0)
                        )
                ))
        ));

        ArgumentCaptor<CourseOfferingData> captor = ArgumentCaptor.forClass(CourseOfferingData.class);
        verify(courseOfferingPort).create(captor.capture());
        assertThat(captor.getValue().status()).isEqualTo("DRAFT");
        assertThat(captor.getValue().sections().getFirst().sectionCode()).isEqualTo("A");
        assertThat(captor.getValue().sections().getFirst().teacherCandidates()).hasSize(1);
    }

    @Test
    @DisplayName("createCourseOffering: matrícula inválida → BadRequestException")
    void createCourseOffering_invalidEnrollment() {
        assertThatThrownBy(() -> service.createCourseOffering(new CourseOfferingData(
                UUID.randomUUID(), UUID.randomUUID(), -1, "DRAFT", List.of()
        ))).isInstanceOf(BadRequestException.class);
    }
}
