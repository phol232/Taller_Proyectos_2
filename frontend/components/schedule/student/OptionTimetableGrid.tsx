"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TimetableSlot } from "@/types/schedule";

const DAYS: { key: string; label: string }[] = [
  { key: "MONDAY", label: "Lunes" },
  { key: "TUESDAY", label: "Martes" },
  { key: "WEDNESDAY", label: "Miércoles" },
  { key: "THURSDAY", label: "Jueves" },
  { key: "FRIDAY", label: "Viernes" },
  { key: "SATURDAY", label: "Sábado" },
  { key: "SUNDAY", label: "Domingo" },
];

const COURSE_COLORS = [
  { bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", text: "text-violet-900 dark:text-violet-200", badge: "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300" },
  { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", text: "text-blue-900 dark:text-blue-200", badge: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-200", badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", text: "text-amber-900 dark:text-amber-200", badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300" },
  { bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800", text: "text-rose-900 dark:text-rose-200", badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-200 dark:border-sky-800", text: "text-sky-900 dark:text-sky-200", badge: "bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300" },
  { bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-800", text: "text-teal-900 dark:text-teal-200", badge: "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300" },
];

const COMPONENT_LABEL: Record<string, string> = {
  THEORY: "Teoría",
  PRACTICE: "Práctica",
  GENERAL: "General",
};

function fmt(time: string) {
  return time.slice(0, 5);
}

export default function OptionTimetableGrid({ slots }: { slots: TimetableSlot[] }) {
  const colorPalette = useMemo(() => {
    const palette = new Map<string, number>();
    for (const s of slots) {
      if (!palette.has(s.courseId)) palette.set(s.courseId, palette.size % COURSE_COLORS.length);
    }
    return palette;
  }, [slots]);

  const byDay = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const s of slots) {
      if (!map.has(s.dayOfWeek)) map.set(s.dayOfWeek, []);
      map.get(s.dayOfWeek)!.push(s);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [slots]);

  const activeDays = useMemo(() => DAYS.filter((d) => byDay.has(d.key)), [byDay]);

  if (slots.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Esta opción no tiene bloques para mostrar.
      </div>
    );
  }

  return (
    <div
      className="grid divide-x divide-border overflow-hidden rounded-xl ring-1 ring-border"
      style={{ gridTemplateColumns: `repeat(${activeDays.length}, minmax(0, 1fr))` }}
    >
      {activeDays.map((day) => {
        const daySlots = byDay.get(day.key) ?? [];
        return (
          <div key={day.key} className="min-w-0">
            <div className="border-b border-border bg-muted/50 px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {day.label}
            </div>
            <div className="space-y-1.5 p-2">
              {daySlots.map((slot) => {
                const c = COURSE_COLORS[colorPalette.get(slot.courseId) ?? 0];
                return (
                  <div
                    key={slot.slotId}
                    className={cn("rounded-lg border px-2 py-2 text-xs leading-tight", c.bg, c.border, c.text)}
                  >
                    <p className="mb-0.5 font-mono text-[10px] opacity-60">
                      {fmt(slot.startTime)} – {fmt(slot.endTime)}
                    </p>
                    <span className={cn("mb-1 inline-block rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide", c.badge)}>
                      {COMPONENT_LABEL[slot.componentType] ?? slot.componentType}
                    </span>
                    <p className="truncate font-semibold">{slot.courseCode}</p>
                    <p className="truncate text-[11px] opacity-75">{slot.courseName}</p>
                    <p className="mt-0.5 truncate text-[10px] opacity-55">{slot.teacherName}</p>
                    <p className="mt-0.5 truncate text-[10px] opacity-55">{slot.classroomCode}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
