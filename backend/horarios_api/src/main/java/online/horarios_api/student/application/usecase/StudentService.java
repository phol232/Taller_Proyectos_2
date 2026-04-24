package online.horarios_api.student.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;
import online.horarios_api.student.domain.port.in.StudentCommandUseCase;
import online.horarios_api.student.domain.port.in.StudentProvisioningUseCase;
import online.horarios_api.student.domain.port.in.StudentQueryUseCase;
import online.horarios_api.student.domain.port.out.StudentPort;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RequiredArgsConstructor
public class StudentService implements StudentCommandUseCase, StudentQueryUseCase, StudentProvisioningUseCase {

    private final StudentPort studentPort;

    @Override
    @Transactional
    public Student createStudent(StudentData command) {
        return studentPort.create(normalize(command));
    }

    @Override
    @Transactional
    public Student updateStudent(UUID studentId, StudentData command) {
        ensureExists(studentId);
        return studentPort.update(studentId, normalize(command));
    }

    @Override
    @Transactional
    public void deactivateStudent(UUID studentId) {
        ensureExists(studentId);
        studentPort.deactivate(studentId);
    }

    @Override
    @Transactional
    public void deleteStudent(UUID studentId) {
        ensureExists(studentId);
        studentPort.delete(studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public Student getStudent(UUID studentId) {
        return ensureExists(studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> listStudents() {
        return studentPort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> searchStudents(String query) {
        if (query == null || query.isBlank()) {
            return studentPort.findAll();
        }
        return studentPort.searchByCodeOrName(query.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Student> listStudentsPaged(int page, int pageSize) {
        return studentPort.findAllPaged(page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Student> searchStudentsPaged(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return studentPort.findAllPaged(page, pageSize);
        }
        return studentPort.searchPaged(query.trim(), page, pageSize);
    }

    private Student ensureExists(UUID studentId) {
        return studentPort.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado."));
    }

    private StudentData normalize(StudentData command) {
        if (command.cycle() <= 0) {
            throw new BadRequestException("El ciclo del estudiante debe ser mayor a 0.");
        }
        int creditLimit = command.creditLimit() == null ? 22 : command.creditLimit();
        if (creditLimit <= 0) {
            throw new BadRequestException("El límite de créditos debe ser mayor a 0.");
        }

        List<String> approvedCourses = command.approvedCourses() == null
                ? List.of()
                : command.approvedCourses().stream()
                .map(this::normalizeNullable)
                .filter(value -> value != null)
                .map(value -> value.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));

        return new StudentData(
                command.userId(),
                requireText(command.code(), "El código del estudiante es obligatorio.").toUpperCase(Locale.ROOT),
                requireText(command.fullName(), "El nombre del estudiante es obligatorio."),
                command.cycle(),
                normalizeNullable(command.career()),
                creditLimit,
                command.isActive() == null ? Boolean.TRUE : command.isActive(),
                command.facultadId(),
                command.carreraId(),
                approvedCourses
        );
    }

    private String requireText(String value, String message) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    // ── Provisioning (OAuth2 Google) ─────────────────────────────

    @Override
    @Transactional
    public void provisionStudentIfAbsent(UUID userId, String email, String fullName) {
        if (userId == null) {
            return;
        }
        if (studentPort.findByUserId(userId).isPresent()) {
            return;
        }

        String safeFullName = fullName == null || fullName.isBlank()
                ? (email == null ? "Estudiante" : email)
                : fullName.trim();

        String code = deriveCodeFromEmail(email, userId);

        StudentData data = new StudentData(
                userId,
                code,
                safeFullName,
                1,
                null,
                22,
                Boolean.TRUE,
                null,
                null,
                List.of()
        );

        studentPort.create(normalize(data));
    }

    private String deriveCodeFromEmail(String email, UUID userId) {
        if (email != null && email.contains("@")) {
            String prefix = email.substring(0, email.indexOf('@')).trim();
            if (!prefix.isEmpty()) {
                return prefix.toUpperCase(Locale.ROOT);
            }
        }
        // Fallback: primeros 8 chars del UUID
        return userId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
