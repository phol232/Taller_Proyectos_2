package online.horarios_api.academicperiod.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodCommandUseCase;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodQueryUseCase;
import online.horarios_api.academicperiod.infrastructure.in.web.AcademicPeriodController;
import online.horarios_api.academicperiod.infrastructure.in.web.dto.AcademicPeriodRequest;
import online.horarios_api.shared.infrastructure.web.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AcademicPeriodController — tests MVC")
class AcademicPeriodControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Mock
    private AcademicPeriodCommandUseCase academicPeriodCommandUseCase;

    @Mock
    private AcademicPeriodQueryUseCase academicPeriodQueryUseCase;

    @InjectMocks
    private AcademicPeriodController controller;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setValidator(validator)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/academic-periods: payload inválido → 400")
    void createAcademicPeriod_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/academic-periods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AcademicPeriodRequest("", "", null, null, "", null)
                        )))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(academicPeriodCommandUseCase);
    }

    @Test
    @DisplayName("POST /api/academic-periods: payload válido → 200")
    void createAcademicPeriod_validPayload_returns200() throws Exception {
        AcademicPeriod period = new AcademicPeriod(UUID.randomUUID(), "2026-I", "Periodo 2026-I",
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 7, 31), "PLANNING", 22, true, Instant.now(), Instant.now());
        when(academicPeriodCommandUseCase.createAcademicPeriod(any())).thenReturn(period);

        mockMvc.perform(post("/api/academic-periods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AcademicPeriodRequest("2026-I", "Periodo 2026-I",
                                        LocalDate.of(2026, 3, 1), LocalDate.of(2026, 7, 31), "PLANNING", 22)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("2026-I"));
    }
}
