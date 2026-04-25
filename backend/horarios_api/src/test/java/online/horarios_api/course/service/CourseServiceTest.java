package online.horarios_api.course.service;

import online.horarios_api.course.application.usecase.CourseService;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.course.domain.port.out.CoursePort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseService — lógica de negocio")
class CourseServiceTest {

    @Mock
    private CoursePort coursePort;

    @InjectMocks
    private CourseService service;

    @Test
    @DisplayName("createCourse: normaliza código y elimina prerrequisitos duplicados")
    void createCourse_normalizesPayload() {
        UUID courseId = UUID.randomUUID();
        when(coursePort.create(any())).thenAnswer(invocation -> {
            CourseData data = invocation.getArgument(0);
            return new Course(courseId, data.code(), data.name(), data.cycle(), data.credits(), data.requiredCredits(),
                    data.weeklyHours(), data.requiredRoomType(), data.isActive(), data.prerequisites(), Instant.now(), Instant.now());
        });

        service.createCourse(new CourseData(
                " inf-101 ",
                " Introducción a Programación ",
                3,
                4,
                12,
                6,
                " lab ",
                null,
                List.of("mat-001", "MAT-001", " fis-100 ")
        ));

        ArgumentCaptor<CourseData> captor = ArgumentCaptor.forClass(CourseData.class);
        verify(coursePort).create(captor.capture());

        assertThat(captor.getValue().code()).isEqualTo("INF-101");
        assertThat(captor.getValue().name()).isEqualTo("Introducción a Programación");
        assertThat(captor.getValue().cycle()).isEqualTo(3);
        assertThat(captor.getValue().requiredCredits()).isEqualTo(12);
        assertThat(captor.getValue().requiredRoomType()).isEqualTo("lab");
        assertThat(captor.getValue().prerequisites()).containsExactly("MAT-001", "FIS-100");
        assertThat(captor.getValue().isActive()).isTrue();
    }

    @Test
    @DisplayName("createCourse: se rechaza un curso como prerrequisito de sí mismo")
    void createCourse_rejectsSelfPrerequisite() {
        assertThatThrownBy(() -> service.createCourse(new CourseData(
                "INF-101",
                "Curso",
                1,
                4,
                0,
                4,
                "lab",
                true,
                List.of("INF-101")
        ))).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("getCourse: curso inexistente → NotFoundException")
    void getCourse_notFound() {
        UUID courseId = UUID.randomUUID();
        when(coursePort.findById(courseId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCourse(courseId))
                .isInstanceOf(NotFoundException.class);
    }
}
