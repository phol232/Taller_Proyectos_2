package online.horarios_api.profile.domain.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class PreferredShiftCodec {

    private PreferredShiftCodec() {}

    public static String encode(List<PreferredShift> shifts) {
        if (shifts == null || shifts.isEmpty()) return null;
        if (shifts.contains(PreferredShift.FLEXIBLE)) return PreferredShift.FLEXIBLE.name();
        List<String> names = new ArrayList<>();
        for (PreferredShift shift : shifts) {
            String name = shift.name();
            if (!names.contains(name)) names.add(name);
        }
        Collections.sort(names);
        return String.join(",", names);
    }

    public static List<PreferredShift> decode(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        List<PreferredShift> out = new ArrayList<>();
        for (String token : csv.split(",")) {
            String trimmed = token.trim();
            if (trimmed.isEmpty()) continue;
            try {
                out.add(PreferredShift.valueOf(trimmed));
            } catch (IllegalArgumentException ignored) {
                // valor desconocido en BD: lo omitimos
            }
        }
        return out;
    }
}
