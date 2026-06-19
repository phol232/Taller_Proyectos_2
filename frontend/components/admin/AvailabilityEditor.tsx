"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import type { AvailabilitySlot, ScheduleDay } from "@/types/admin";

const DAYS: ScheduleDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<ScheduleDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const FIELD_CLASSNAME =
  "h-9 w-full rounded-md border border-input bg-input px-3 text-xs text-foreground shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";

interface AvailabilityEditorProps {
  label: string;
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
  error?: string;
}

export function AvailabilityEditor({
  label,
  value,
  onChange,
  error,
}: AvailabilityEditorProps) {
  function updateSlot(index: number, patch: Partial<AvailabilitySlot>) {
    onChange(value.map((slot, current) => (current === index ? { ...slot, ...patch } : slot)));
  }

  function addSlot() {
    onChange([
      ...value,
      { day: "MONDAY", startTime: "07:00", endTime: "22:00", available: true },
    ]);
  }

  function removeSlot(index: number) {
    onChange(value.filter((_, current) => current !== index));
  }

  return (
    <FormField
      label={label}
      error={error}
      description="Registra solo franjas reales. Estas ventanas se usarán como restricción operativa."
    >
      <div className="rounded-lg border border-input bg-muted/50">
        {value.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin franjas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/70">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Día</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Inicio</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Fin</th>
                  <th className="w-16 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {value.map((slot, index) => (
                  <tr key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`} className="bg-card">
                    <td className="px-3 py-1.5">
                      <select
                        className={FIELD_CLASSNAME}
                        value={slot.day}
                        onChange={(event) => updateSlot(index, { day: event.target.value as ScheduleDay })}
                        aria-label={`Día de la franja ${index + 1}`}
                      >
                        {DAYS.map((day) => (
                          <option key={day} value={day}>
                            {DAY_LABELS[day]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className={FIELD_CLASSNAME}
                        type="time"
                        value={slot.startTime}
                        onChange={(event) => updateSlot(index, { startTime: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className={FIELD_CLASSNAME}
                        type="time"
                        value={slot.endTime}
                        onChange={(event) => updateSlot(index, { endTime: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(index)}
                        className="h-9 w-full rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Quitar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border bg-muted/40 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSlot}
            className="h-8 rounded-md bg-background text-foreground hover:bg-accent"
          >
            + Agregar franja
          </Button>
        </div>
      </div>
    </FormField>
  );
}
