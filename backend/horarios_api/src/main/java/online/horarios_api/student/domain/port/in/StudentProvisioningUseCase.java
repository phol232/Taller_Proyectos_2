package online.horarios_api.student.domain.port.in;

import java.util.UUID;

public interface StudentProvisioningUseCase {

    void provisionStudentIfAbsent(UUID userId, String email, String fullName);
}
