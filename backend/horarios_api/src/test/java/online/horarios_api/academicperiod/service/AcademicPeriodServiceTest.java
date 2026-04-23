package online.horarios_api.academicperiod.service;

import online.horarios_api.academicperiod.application.usecase.AcademicPeriodService;
import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;
import online.horarios_api.academicperiod.domain.port.out.AcademicPeriodPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AcademicPeriodService — lógica de negocio")
class AcademicPeriodServiceTest {

    @Mock
    private AcademicPeriodPort academicPeriodPort;

    @InjectMocks
    private AcademicPeriodService service;

    @Test
    @DisplayName("createAcademicPeriod: normaliza código y estado")
    void createAcademicPeriod_normalizesPayload() {
        when(academicPeriodPort.create(any())).thenAnswer(invocation -> {
            AcademicPeriodData data = invocation.getArgument(0);
            return new AcademicPeriod(UUID.randomUUID(), data.code(), data.name(), data.startsAt(), data.endsAt(),
                    data.status(), data.maxStudentCredits(), true, Instant.now(), Instant.now());
        });

        service.createAcademicPeriod(new AcademicPeriodData(
                " 2026-I ",
                " Periodo 2026-I ",
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 7, 31),
                " planning ",
                null
        ));

        ArgumentCaptor<AcademicPeriodData> captor = ArgumentCaptor.forClass(AcademicPeriodData.class);
        verify(academicPeriodPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo("2026-I");
        assertThat(captor.getValue().status()).isEqualTo("PLANNING");
        assertThat(captor.getValue().maxStudentCredits()).isEqualTo(22);
    }

    @Test
    @DisplayName("createAcademicPeriod: fechas inválidas → BadRequestException")
    void createAcademicPeriod_invalidDates() {
        assertThatThrownBy(() -> service.createAcademicPeriod(new AcademicPeriodData(
                "2026-I",
                "Periodo",
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 7, 1),
                "PLANNING",
                22
        ))).isInstanceOf(BadRequestException.class);
    }
}
