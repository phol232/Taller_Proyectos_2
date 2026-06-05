package online.horarios_api.scheduling.infrastructure.out.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.ScheduleAssignmentSlot;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.model.TimeSlot;
import online.horarios_api.scheduling.domain.port.out.ScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCallback;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Time;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcScheduleBuilderRepository implements ScheduleBuilderRepository {

    private static final TypeReference<List<Map<String, Object>>> SLOT_LIST_TYPE =
            new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<TimeSlot> listActiveTimeSlots() {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_active_time_slots()",
                (rs, rowNum) -> new TimeSlot(
                        rs.getObject("id", UUID.class),
                        rs.getString("day_of_week"),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime(),
                        rs.getInt("slot_order")
                )
        );
    }

    @Override
    public List<ScheduleAssignment> listAssignments(UUID scheduleId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_builder_list_assignments(?)",
                (rs, rowNum) -> {
                    String slotsJson = rs.getString("slots");
                    List<ScheduleAssignmentSlot> slots = parseSlots(slotsJson);
                    return new ScheduleAssignment(
                            rs.getObject("assignment_id", UUID.class),
                            rs.getObject("course_id", UUID.class),
                            rs.getString("course_code"),
                            rs.getString("course_name"),
                            rs.getObject("course_component_id", UUID.class),
                            rs.getString("component_type"),
                            rs.getBigDecimal("component_weekly_hours"),
                            rs.getObject("teacher_id", UUID.class),
                            rs.getString("teacher_code"),
                            rs.getString("teacher_name"),
                            rs.getObject("section_id", UUID.class),
                            rs.getString("section_nrc"),
                            rs.getString("assignment_status"),
                            rs.getBigDecimal("assigned_hours"),
                            rs.getBoolean("is_complete"),
                            slots
                    );
                },
                scheduleId
        );
    }

    @Override
    public boolean teacherTeachesComponent(UUID teacherId, UUID courseComponentId) {
        if (teacherId == null || courseComponentId == null) return false;
        List<UUID> componentIds = jdbcTemplate.query(
                "SELECT * FROM fn_list_teacher_course_component_ids(?)",
                (rs, rowNum) -> rs.getObject("course_component_id", UUID.class),
                teacherId);
        return componentIds.contains(courseComponentId);
    }

    @Override
    public List<UUID> timeSlotIdsOutsideTeacherAvailability(UUID teacherId, List<UUID> timeSlotIds) {
        if (teacherId == null || timeSlotIds == null || timeSlotIds.isEmpty()) {
            return List.of();
        }

        List<AvailabilityRange> ranges = jdbcTemplate.query(
                "SELECT * FROM fn_list_teacher_availability(?)",
                (rs, rowNum) -> new AvailabilityRange(
                        rs.getString("day_of_week"),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime(),
                        rs.getBoolean("is_available")),
                teacherId);

        Map<String, List<LocalTime[]>> rangesByDay = new HashMap<>();
        for (AvailabilityRange r : ranges) {
            if (!r.available()) continue;
            rangesByDay
                    .computeIfAbsent(r.day(), k -> new ArrayList<>())
                    .add(new LocalTime[]{r.start(), r.end()});
        }
        // Defensivo: si el docente no tiene disponibilidad declarada, no bloqueamos.
        if (rangesByDay.isEmpty()) return List.of();

        Map<UUID, TimeSlot> tsById = new HashMap<>();
        for (TimeSlot ts : listActiveTimeSlots()) tsById.put(ts.id(), ts);

        List<UUID> outside = new ArrayList<>();
        for (UUID id : timeSlotIds) {
            TimeSlot ts = tsById.get(id);
            if (ts == null) continue;
            List<LocalTime[]> dayRanges = rangesByDay.getOrDefault(ts.dayOfWeek(), List.of());
            boolean covered = dayRanges.stream().anyMatch(r ->
                    !r[0].isAfter(ts.startTime()) && !r[1].isBefore(ts.endTime()));
            if (!covered) outside.add(id);
        }
        return outside;
    }

    private record AvailabilityRange(String day, LocalTime start, LocalTime end, boolean available) {}

    @Override
    public UUID addCourse(UUID scheduleId,
                          UUID courseComponentId,
                          UUID teacherId,
                          UUID sectionId,
                          List<SlotInput> slots) {
        String payload = toJsonSlots(slots);

        return jdbcTemplate.execute(
                "SELECT fn_builder_add_course(?, ?, ?, ?, ?::jsonb)",
                (PreparedStatementCallback<UUID>) ps -> {
                    ps.setObject(1, scheduleId);
                    ps.setObject(2, courseComponentId);
                    ps.setObject(3, teacherId);
                    ps.setObject(4, sectionId);
                    ps.setString(5, payload);
                    try (var rs = ps.executeQuery()) {
                        if (rs.next()) {
                            return rs.getObject(1, UUID.class);
                        }
                        return null;
                    }
                }
        );
    }

    @Override
    public UUID addSlot(UUID assignmentId, SlotInput slot) {
        return jdbcTemplate.queryForObject(
                "SELECT fn_builder_add_slot(?, ?, ?, ?, ?)",
                UUID.class,
                assignmentId,
                slot.classroomId(),
                slot.timeSlotId(),
                Time.valueOf(slot.startTime()),
                Time.valueOf(slot.endTime())
        );
    }

    @Override
    public RemovedSlotResult removeSlot(UUID slotId) {
        return jdbcTemplate.queryForObject(
                "SELECT * FROM fn_builder_remove_slot(?)",
                (rs, rowNum) -> new RemovedSlotResult(
                        rs.getObject("assignment_id", UUID.class),
                        rs.getBoolean("assignment_left_incomplete"),
                        rs.getBigDecimal("assigned_hours"),
                        rs.getBigDecimal("required_hours")
                ),
                slotId
        );
    }

    @Override
    public void removeAssignment(UUID assignmentId) {
        jdbcTemplate.query(
                "SELECT fn_builder_remove_assignment(?)",
                resultSet -> null,
                assignmentId
        );
    }

    @Override
    public List<SlotConflict> validateSlot(UUID scheduleId,
                                           UUID assignmentId,
                                           UUID teacherId,
                                           UUID classroomId,
                                           UUID timeSlotId,
                                           LocalTime startTime,
                                           LocalTime endTime,
                                           UUID excludeSlotId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_builder_validate_slot(?, ?, ?, ?, ?, ?, ?, ?)",
                (rs, rowNum) -> new SlotConflict(
                        rs.getString("conflict_type"),
                        rs.getObject("resource_id", UUID.class),
                        rs.getString("message")
                ),
                scheduleId,
                assignmentId,
                teacherId,
                classroomId,
                timeSlotId,
                Time.valueOf(startTime),
                Time.valueOf(endTime),
                excludeSlotId
        );
    }

    private List<ScheduleAssignmentSlot> parseSlots(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, SLOT_LIST_TYPE);
            List<ScheduleAssignmentSlot> out = new ArrayList<>(raw.size());
            for (Map<String, Object> row : raw) {
                out.add(new ScheduleAssignmentSlot(
                        toUuid(row.get("slot_id")),
                        toUuid(row.get("time_slot_id")),
                        toStr(row.get("day_of_week")),
                        toStr(row.get("start_time")),
                        toStr(row.get("end_time")),
                        toUuid(row.get("classroom_id")),
                        toStr(row.get("classroom_code")),
                        toStr(row.get("classroom_name"))
                ));
            }
            return out;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudieron leer las franjas del horario.");
        }
    }

    private String toJsonSlots(List<SlotInput> slots) {
        if (slots == null || slots.isEmpty()) {
            return "[]";
        }
        List<Map<String, Object>> payload = new ArrayList<>(slots.size());
        for (SlotInput s : slots) {
            payload.add(Map.of(
                    "classroom_id", s.classroomId().toString(),
                    "time_slot_id", s.timeSlotId().toString(),
                    "start_time",   s.startTime().toString(),
                    "end_time",     s.endTime().toString()
            ));
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudo serializar las franjas.");
        }
    }

    private static UUID toUuid(Object value) {
        if (value == null) return null;
        if (value instanceof UUID u) return u;
        return UUID.fromString(value.toString());
    }

    private static String toStr(Object value) {
        return value == null ? null : value.toString();
    }

    @SuppressWarnings("unused")
    private static BigDecimal toDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal d) return d;
        return new BigDecimal(value.toString());
    }
}
