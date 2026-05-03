package online.horarios_api.scheduling.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.GenerationReservation;
import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;
import online.horarios_api.scheduling.domain.model.ScheduleOption;
import online.horarios_api.scheduling.domain.port.out.ScheduleGenerationRepository;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcScheduleGenerationRepository implements ScheduleGenerationRepository {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public GenerationReservation reserveGeneration(UUID actorId, UUID academicPeriodId) {
        return jdbcTemplate.queryForObject(
                "SELECT * FROM fn_solver_reserve_generation_request(?, ?)",
                (rs, rowNum) -> new GenerationReservation(
                        rs.getObject("reservation_id", UUID.class),
                        rs.getBoolean("accepted"),
                        rs.getInt("retry_after_seconds"),
                        rs.getInt("remaining")
                ),
                actorId,
                academicPeriodId
        );
    }

    @Override
    public List<ScheduleOption> listOptions(UUID academicPeriodId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_teaching_schedule_options(?)",
                (rs, rowNum) -> new ScheduleOption(
                        rs.getObject("id", UUID.class),
                        rs.getObject("academic_period_id", UUID.class),
                        rs.getString("status"),
                        rs.getObject("created_by", UUID.class),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant(),
                        rs.getTimestamp("confirmed_at") != null
                                ? rs.getTimestamp("confirmed_at").toInstant()
                                : null,
                        rs.getObject("solver_run_id", UUID.class),
                        (Integer) rs.getObject("seed"),
                        rs.getInt("offer_count"),
                        rs.getInt("slot_count")
                ),
                academicPeriodId
        );
    }

    @Override
    public ScheduleGenerationRun getGenerationRun(UUID runId) {
        List<ScheduleGenerationRun> runs = jdbcTemplate.query(
                "SELECT * FROM fn_solver_get_run(?)",
                (rs, rowNum) -> new ScheduleGenerationRun(
                        rs.getObject("id", UUID.class),
                        rs.getString("run_type"),
                        rs.getObject("academic_period_id", UUID.class),
                        rs.getObject("student_id", UUID.class),
                        rs.getObject("teaching_schedule_id", UUID.class),
                        rs.getString("status"),
                        rs.getObject("requested_by", UUID.class),
                        (Integer) rs.getObject("seed"),
                        (Integer) rs.getObject("time_limit_ms"),
                        rs.getString("input_hash"),
                        rs.getString("result_summary"),
                        toInstant(rs.getTimestamp("started_at")),
                        toInstant(rs.getTimestamp("finished_at")),
                        toInstant(rs.getTimestamp("created_at")),
                        List.of()
                ),
                runId
        );
        if (runs.isEmpty()) {
            throw new NotFoundException("Run de generación no encontrado: " + runId);
        }

        List<ScheduleGenerationRun.Conflict> conflicts = jdbcTemplate.query(
                "SELECT * FROM fn_solver_list_run_conflicts(?)",
                (rs, rowNum) -> new ScheduleGenerationRun.Conflict(
                        rs.getString("conflict_type"),
                        rs.getString("resource_type"),
                        rs.getObject("resource_id", UUID.class),
                        rs.getObject("course_id", UUID.class),
                        rs.getObject("time_slot_id", UUID.class),
                        rs.getString("message"),
                        toInstant(rs.getTimestamp("created_at"))
                ),
                runId
        );

        ScheduleGenerationRun run = runs.getFirst();
        return new ScheduleGenerationRun(
                run.id(),
                run.runType(),
                run.academicPeriodId(),
                run.studentId(),
                run.teachingScheduleId(),
                run.status(),
                run.requestedBy(),
                run.seed(),
                run.timeLimitMs(),
                run.inputHash(),
                run.resultSummary(),
                run.startedAt(),
                run.finishedAt(),
                run.createdAt(),
                conflicts
        );
    }

    @Override
    public UUID confirmOption(UUID scheduleId, UUID actorId) {
        return jdbcTemplate.queryForObject(
                "SELECT fn_confirm_teaching_schedule(?, ?)",
                UUID.class,
                scheduleId,
                actorId
        );
    }

    @Override
    public void cancelOption(UUID scheduleId, UUID actorId) {
        jdbcTemplate.query(
                "SELECT fn_cancel_teaching_schedule(?, ?)",
                resultSet -> null,
                scheduleId,
                actorId
        );
    }

    private static java.time.Instant toInstant(Timestamp timestamp) {
        return timestamp != null ? timestamp.toInstant() : null;
    }
}
