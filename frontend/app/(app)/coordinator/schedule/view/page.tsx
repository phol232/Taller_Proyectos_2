"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Building2, ChevronDown, Search } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { getTimetable } from "@/lib/scheduleApi";
import { cn } from "@/lib/utils";
import type { TimetableSlot } from "@/types/schedule";

const DAYS: { key: string; label: string }[] = [
  { key: "MONDAY",    label: "Lun" },
  { key: "TUESDAY",   label: "Mar" },
  { key: "WEDNESDAY", label: "Mié" },
  { key: "THURSDAY",  label: "Jue" },
  { key: "FRIDAY",    label: "Vie" },
  { key: "SATURDAY",  label: "Sáb" },
  { key: "SUNDAY",    label: "Dom" },
];

const COURSE_COLORS = [
  { bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", text: "text-violet-900 dark:text-violet-200", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300" },
  { bg: "bg-blue-50 dark:bg-blue-950/40",     border: "border-blue-200 dark:border-blue-800",     text: "text-blue-900 dark:text-blue-200",     badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-200", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800",   text: "text-amber-900 dark:text-amber-200",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
  { bg: "bg-rose-50 dark:bg-rose-950/40",     border: "border-rose-200 dark:border-rose-800",     text: "text-rose-900 dark:text-rose-200",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/40",       border: "border-sky-200 dark:border-sky-800",       text: "text-sky-900 dark:text-sky-200",       badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300" },
  { bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", text: "text-orange-900 dark:text-orange-200", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300" },
  { bg: "bg-teal-50 dark:bg-teal-950/40",     border: "border-teal-200 dark:border-teal-800",     text: "text-teal-900 dark:text-teal-200",     badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300" },
];

const COMPONENT_LABEL: Record<string, string> = {
  THEORY:   "Teoría",
  PRACTICE: "Práctica",
  GENERAL:  "General",
};

function fmt(time: string) {
  return time.slice(0, 5);
}

export default function ScheduleViewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const scheduleId = params.get("scheduleId") ?? "";

  const [selectedClassroomId, setSelectedClassroomId] = useState("all");
  const [query, setQuery] = useState("");

  const { data: slots = [], isLoading } = useSWR(
    scheduleId ? `timetable-${scheduleId}` : null,
    () => getTimetable(scheduleId),
  );

  const colorPalette = useMemo(() => {
    const palette = new Map<string, number>();
    for (const s of slots) {
      if (!palette.has(s.courseId)) palette.set(s.courseId, palette.size % COURSE_COLORS.length);
    }
    return palette;
  }, [slots]);

  const classrooms = useMemo(() => {
    const seen = new Map<string, { id: string; code: string; name: string; type: string }>();
    for (const s of slots) {
      if (!seen.has(s.classroomId))
        seen.set(s.classroomId, { id: s.classroomId, code: s.classroomCode, name: s.classroomName, type: s.classroomType });
    }
    return Array.from(seen.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [slots]);

  const activeDays = useMemo(() => {
    const used = new Set(slots.map((s) => s.dayOfWeek));
    return DAYS.filter((d) => used.has(d.key));
  }, [slots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slots.filter((s) => {
      const matchRoom = selectedClassroomId === "all" || s.classroomId === selectedClassroomId;
      const matchQ = !q || [s.courseCode, s.courseName, s.teacherName, s.classroomCode]
        .some((v) => v?.toLowerCase().includes(q));
      return matchRoom && matchQ;
    });
  }, [slots, selectedClassroomId, query]);

  const visibleClassrooms = useMemo(() => {
    if (selectedClassroomId !== "all") return classrooms.filter((c) => c.id === selectedClassroomId);
    const used = new Set(filtered.map((s) => s.classroomId));
    return classrooms.filter((c) => used.has(c.id));
  }, [classrooms, filtered, selectedClassroomId]);

  return (
    <PageShell
      title="Vista de horario"
      description="Distribución semanal por aula"
      actions={
        <button
          type="button"
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-foreground/60 ring-1 ring-border transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar curso, docente o aula…"
            className="h-9 rounded-lg pl-8 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            aria-label="Filtrar por aula"
            className="h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm text-foreground outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
          >
            <option value="all">Todas las aulas ({classrooms.length})</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 ring-1 ring-border">
          <span className="text-xs text-muted-foreground">
            {filtered.length} bloques · {visibleClassrooms.length} aulas
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
        </div>
      )}

      {!isLoading && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card py-16 ring-1 ring-border">
          <p className="text-sm font-medium text-foreground">Este horario aún no tiene asignaciones.</p>
          <p className="mt-1 text-xs text-muted-foreground">El solver puede no haber terminado o no encontró solución.</p>
        </div>
      )}

      {!isLoading && visibleClassrooms.length > 0 && (
        <div className="space-y-4">
          {visibleClassrooms.map((classroom) => {
            const roomSlots = filtered.filter((s) => s.classroomId === classroom.id);
            if (roomSlots.length === 0) return null;

            return (
              <ClassroomBlock
                key={classroom.id}
                classroom={classroom}
                activeDays={activeDays}
                slots={roomSlots}
                colorPalette={colorPalette}
              />
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function ClassroomBlock({
  classroom,
  activeDays,
  slots,
  colorPalette,
}: {
  classroom: { id: string; code: string; name: string; type: string };
  activeDays: { key: string; label: string }[];
  slots: TimetableSlot[];
  colorPalette: Map<string, number>;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const s of slots) {
      if (!map.has(s.dayOfWeek)) map.set(s.dayOfWeek, []);
      map.get(s.dayOfWeek)!.push(s);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [slots]);

  const daysWithSlots = activeDays.filter((d) => byDay.has(d.key));

  return (
    <section className="card-elevated overflow-hidden rounded-xl bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f3e8ff] dark:bg-[#6B21A8]/20">
          <Building2 className="h-3.5 w-3.5 text-[#6B21A8]" />
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">{classroom.code}</span>
        <span className="text-sm text-muted-foreground">{classroom.name}</span>
        <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">{classroom.type}</span>
        <span className="ml-auto text-xs text-muted-foreground">{slots.length} bloque{slots.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Day columns */}
      <div
        className="grid divide-x divide-border"
        style={{ gridTemplateColumns: `repeat(${daysWithSlots.length}, minmax(0, 1fr))` }}
      >
        {daysWithSlots.map((day) => {
          const daySlots = byDay.get(day.key) ?? [];
          return (
            <div key={day.key} className="min-w-0">
              <div className="border-b border-border px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {day.label}
              </div>
              <div className="space-y-1.5 p-2">
                {daySlots.map((slot) => {
                  const colorIdx = colorPalette.get(slot.courseId) ?? 0;
                  const c = COURSE_COLORS[colorIdx];
                  return (
                    <div
                      key={slot.slotId}
                      className={cn("rounded-lg border px-2 py-1.5 text-xs leading-tight", c.bg, c.border, c.text)}
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
                      {slot.nrc && (
                        <p className="mt-0.5 font-mono text-[9px] opacity-40">NRC {slot.nrc}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
