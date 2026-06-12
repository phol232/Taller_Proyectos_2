package online.horarios_api.shared.integration;

import online.horarios_api.academicperiod.domain.port.out.AcademicPeriodPort;
import online.horarios_api.auth.domain.port.out.AuthCookiePort;
import online.horarios_api.auth.domain.port.out.AuthenticationPort;
import online.horarios_api.auth.domain.port.out.JwtGeneratorPort;
import online.horarios_api.auth.domain.port.out.RefreshTokenManagerPort;
import online.horarios_api.catalog.domain.port.out.CatalogPort;
import online.horarios_api.classroom.domain.port.out.ClassroomPort;
import online.horarios_api.course.domain.port.out.CoursePort;
import online.horarios_api.passwordreset.domain.port.out.NotificationPort;
import online.horarios_api.passwordreset.domain.port.out.OtpGeneratorPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordChangePort;
import online.horarios_api.passwordreset.domain.port.out.PasswordHasherPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetConfigPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetTokenPort;
import online.horarios_api.profile.domain.port.out.ProfilePort;
import online.horarios_api.scheduling.domain.port.out.CourseSectionRepository;
import online.horarios_api.scheduling.domain.port.out.ScheduleBuilderRepository;
import online.horarios_api.scheduling.domain.port.out.ScheduleGenerationRepository;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import online.horarios_api.scheduling.domain.port.out.TimetableRepository;
import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import online.horarios_api.student.domain.port.out.StudentPort;
import online.horarios_api.teacher.domain.port.out.TeacherPort;
import online.horarios_api.token.domain.port.out.RefreshTokenPort;
import online.horarios_api.user.domain.port.out.UserPort;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Clase base para pruebas de integración del backend.
 * No se levanta servidor HTTP — MockMvc simula las requests.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource("classpath:application-integration-test.properties")
public abstract class IntegrationTest {

    @Autowired
    private WebApplicationContext wac;

    protected MockMvc mockMvc;

    @BeforeEach
    void setUpMockMvc() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    protected final JwtTestHelper jwtTestHelper = new JwtTestHelper();

    // ── Puertos de autenticación ──────────────────────────────────────
    @MockitoBean protected AuthenticationPort authenticationPort;
    @MockitoBean protected JwtGeneratorPort jwtGeneratorPort;
    @MockitoBean protected RefreshTokenManagerPort refreshTokenManagerPort;
    @MockitoBean protected AuthCookiePort authCookiePort;
    @MockitoBean protected TokenConfigPort tokenConfigPort;

    // ── Puertos de tokens y sesiones ─────────────────────────────────
    @MockitoBean protected RefreshTokenPort refreshTokenPort;
    @MockitoBean protected TokenHasherPort tokenHasherPort;

    // ── Puertos de usuarios ──────────────────────────────────────────
    @MockitoBean protected UserPort userPort;
    @MockitoBean protected UserReadPort userReadPort;

    // ── Puertos de recursos académicos ───────────────────────────────
    @MockitoBean protected AcademicPeriodPort academicPeriodPort;
    @MockitoBean protected CoursePort coursePort;
    @MockitoBean protected TeacherPort teacherPort;
    @MockitoBean protected ClassroomPort classroomPort;
    @MockitoBean protected StudentPort studentPort;
    @MockitoBean protected CatalogPort catalogPort;
    @MockitoBean protected ProfilePort profilePort;

    // ── Puertos de recuperación de contraseña ────────────────────────
    @MockitoBean protected NotificationPort notificationPort;
    @MockitoBean protected OtpGeneratorPort otpGeneratorPort;
    @MockitoBean protected PasswordHasherPort passwordHasherPort;
    @MockitoBean protected PasswordChangePort passwordChangePort;
    @MockitoBean protected PasswordResetTokenPort passwordResetTokenPort;
    @MockitoBean protected PasswordResetConfigPort passwordResetConfigPort;

    // ── Puertos de scheduling ────────────────────────────────────────
    @MockitoBean protected ScheduleBuilderRepository scheduleBuilderRepository;
    @MockitoBean protected ScheduleGenerationRepository scheduleGenerationRepository;
    @MockitoBean protected CourseSectionRepository courseSectionRepository;
    @MockitoBean protected StudentScheduleRepository studentScheduleRepository;
    @MockitoBean protected TimetableRepository timetableRepository;
    @MockitoBean protected SolverClientPort solverClientPort;

    // ── Infraestructura Redis (mockeada para evitar conexión real) ───
    @MockitoBean protected RedisConnectionFactory redisConnectionFactory;
    @MockitoBean protected RedisMessageListenerContainer adminEventsListenerContainer;

}
