"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import type { AvailabilitySlot, ScheduleDay } from "@/types/admin";

const DAYS: ScheduleDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_LABELS: Record<ScheduleDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
};

const FIELD_CLASSNAME =
  "h-12 w-full rounded-lg bg-white px-3 text-sm text-[#171717] shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] outline-none transition-shadow focus-visible:ring-0 focus-visible:shadow-[rgba(0,114,245,1)_0px_0px_0px_2px]";

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
      { day: "MONDAY", startTime: "08:00", endTime: "10:00", available: true },
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
      <div className="space-y-3 rounded-lg bg-[#fafafa] p-4 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]">
        {value.length === 0 && (
          <p className="text-sm text-[#666666]">Sin franjas registradas.</p>
        )}
        {value.map((slot, index) => (
          <div
            key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`}
            className="grid gap-3 rounded-lg bg-white p-3 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] md:grid-cols-[1.2fr_1fr_1fr_auto]"
          >
            <select
              className={FIELD_CLASSNAME}
              value={slot.day}
              onChange={(event) => updateSlot(index, { day: event.target.value as ScheduleDay })}
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS[day]}
                </option>
              ))}
            </select>
            <input
              className={FIELD_CLASSNAME}
              type="time"
              value={slot.startTime}
              onChange={(event) => updateSlot(index, { startTime: event.target.value })}
            />
            <input
              className={FIELD_CLASSNAME}
              type="time"
              value={slot.endTime}
              onChange={(event) => updateSlot(index, { endTime: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeSlot(index)}
              className="rounded-md border-0 bg-white text-[#171717] shadow-[rgb(235,235,235)_0px_0px_0px_1px] hover:bg-[#fafafa]"
            >
              Quitar
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSlot}
          className="w-fit rounded-md border-0 bg-white text-[#171717] shadow-[rgb(235,235,235)_0px_0px_0px_1px] hover:bg-[#f5f5f5]"
        >
          Agregar franja
        </Button>
      </div>
    </FormField>
  );
}
