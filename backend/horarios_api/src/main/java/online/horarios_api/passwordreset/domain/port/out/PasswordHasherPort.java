package online.horarios_api.passwordreset.domain.port.out;

public interface PasswordHasherPort {

    String encode(String rawValue);

    boolean matches(String rawValue, String encodedHash);
}
