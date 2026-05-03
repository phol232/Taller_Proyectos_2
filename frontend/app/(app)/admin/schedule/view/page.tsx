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
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-900",   badge: "bg-blue-100 text-blue-700" },
  { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-900",badge: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-900",  badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-900",   badge: "bg-rose-100 text-rose-700" },
  { bg: "bg-sky-50",    border: "border-sky-200",    text: "text-sky-900",    badge: "bg-sky-100 text-sky-700" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", badge: "bg-orange-100 text-orange-700" },
  { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-900",   badge: "bg-teal-100 text-teal-700" },
];

const COMPONENT_LABEL: Record<string, string> = {
  THEORY:   "Teoría",
  PRACTICE: "Práctica",
  GENERAL:  "General",
};

function fmt(time: string) {
  return time.slice(0, 5);
}

export default function AdminScheduleViewPage() {
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
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[#555] ring-1 ring-[#e5e5e5] transition hover:bg-[#fafafa] hover:text-[#171717]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#aaa]" />
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
            className="h-9 appearance-none rounded-lg border border-[#e5e5e5] bg-white pl-3 pr-8 text-sm text-[#171717] outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
          >
            <option value="all">Todas las aulas ({classrooms.length})</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#aaa]" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#fafafa] px-3 py-1.5 ring-1 ring-[#ebebeb]">
          <span className="text-xs text-[#888]">
            {filtered.length} bloques · {visibleClassrooms.length} aulas
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-[#f5f5f5]" />)}
        </div>
      )}

      {!isLoading && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 ring-1 ring-[#ebebeb]">
          <p className="text-sm font-medium text-[#444]">Este horario aún no tiene asignaciones.</p>
          <p className="mt-1 text-xs text-[#888]">El solver puede no haber terminado o no encontró solución.</p>
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
    <section className="card-elevated overflow-hidden rounded-xl bg-white">
      <div className="flex items-center gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f3e8ff]">
          <Building2 className="h-3.5 w-3.5 text-[#6B21A8]" />
        </span>
        <span className="font-mono text-sm font-semibold text-[#171717]">{classroom.code}</span>
        <span className="text-sm text-[#555]">{classroom.name}</span>
        <span className="rounded bg-[#f0f0f0] px-1.5 py-px text-[10px] text-[#777]">{classroom.type}</span>
        <span className="ml-auto text-xs text-[#aaa]">{slots.length} bloque{slots.length !== 1 ? "s" : ""}</span>
      </div>

      <div
        className="grid divide-x divide-[#f0f0f0]"
        style={{ gridTemplateColumns: `repeat(${daysWithSlots.length}, minmax(0, 1fr))` }}
      >
        {daysWithSlots.map((day) => {
          const daySlots = byDay.get(day.key) ?? [];
          return (
            <div key={day.key} className="min-w-0">
              <div className="border-b border-[#f0f0f0] px-2 py-1.5 text-center text-[11px] font-semibold text-[#777] uppercase tracking-wide">
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
                      <p className="font-semibold truncate">{slot.courseCode}</p>
                      <p className="truncate opacity-75 text-[11px]">{slot.courseName}</p>
                      <p className="mt-0.5 truncate opacity-55 text-[10px]">{slot.teacherName}</p>
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
