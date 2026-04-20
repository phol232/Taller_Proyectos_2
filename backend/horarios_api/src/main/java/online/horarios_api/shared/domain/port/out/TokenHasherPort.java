package online.horarios_api.shared.domain.port.out;

public interface TokenHasherPort {

    String generateRawToken();

    String hash(String rawValue);
}
