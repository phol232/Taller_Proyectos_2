"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Coffee, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ScheduleAssignment,
  ScheduleAssignmentSlot,
  TimeSlot,
} from "@/types/scheduleBuilder";

const DAYS: { key: string; short: string; full: string }[] = [
  { key: "MONDAY", short: "Lun", full: "Lunes" },
  { key: "TUESDAY", short: "Mar", full: "Martes" },
  { key: "WEDNESDAY", short: "Mié", full: "Miércoles" },
  { key: "THURSDAY", short: "Jue", full: "Jueves" },
  { key: "FRIDAY", short: "Vie", full: "Viernes" },
  { key: "SATURDAY", short: "Sáb", full: "Sábado" },
];

const BLOCKS: { start: string; end: string }[] = [
  { start: "07:00", end: "08:30" },
  { start: "08:40", end: "10:10" },
  { start: "10:20", end: "11:50" },
  { start: "12:00", end: "13:30" },
  { start: "14:00", end: "15:30" },
  { start: "15:40", end: "17:10" },
  { start: "17:20", end: "18:50" },
  { start: "19:00", end: "20:30" },
  { start: "20:40", end: "22:10" },
];

const LUNCH_GAP_INDEX = 3;

const COMPONENT_STYLE: Record<
  string,
  { bg: string; border: string; text: string; accent: string; badge: string; label: string }
> = {
  THEORY: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-950 dark:text-violet-100",
    accent: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
    label: "Teoría",
  },
  PRACTICE: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-950 dark:text-emerald-100",
    accent: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
    label: "Práctica",
  },
  GENERAL: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-950 dark:text-sky-100",
    accent: "bg-sky-500",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
    label: "General",
  },
};

function hhmm(t: string) {
  return t.slice(0, 5);
}

function blockIndexOf(start: string, end: string): number {
  const s = hhmm(start);
  const e = hhmm(end);
  return BLOCKS.findIndex((b) => b.start === s && b.end === e);
}

interface Classroom {
  id: string;
  code: string;
  name: string;
}

interface BlockGroup {
  assignment: ScheduleAssignment;
  slots: ScheduleAssignmentSlot[];
  blockStart: number;
  blockSpan: number;
}

interface Props {
  assignments: ScheduleAssignment[];
  timeSlots: TimeSlot[];
  onSlotClick: (assignment: ScheduleAssignment, slot: ScheduleAssignmentSlot) => void;
  onEmptyCellClick: (dayOfWeek: string, timeSlot: TimeSlot, classroom: Classroom) => void;
}

export default function ClassroomMatrixView({
  assignments,
  timeSlots,
  onSlotClick,
  onEmptyCellClick,
}: Props) {
  const { classrooms, groupsByClassroom, occupiedByClassroom, timeSlotLookup } = useMemo(() => {
    const rooms = new Map<string, Classroom>();
    for (const a of assignments) {
      for (const s of a.slots) {
        if (!rooms.has(s.classroomId)) {
          rooms.set(s.classroomId, {
            id: s.classroomId,
            code: s.classroomCode,
            name: s.classroomName,
          });
        }
      }
    }

    const tsLookup = new Map<string, TimeSlot>();
    for (const ts of timeSlots) {
      const key = `${ts.dayOfWeek}|${hhmm(ts.startTime)}|${hhmm(ts.endTime)}`;
      if (!tsLookup.has(key)) tsLookup.set(key, ts);
    }

    const groupsByClassroom = new Map<string, Map<string, BlockGroup[]>>();
    const occupiedByClassroom = new Map<string, Set<string>>();

    for (const room of rooms.values()) {
      const byDay = new Map<string, BlockGroup[]>();
      const occ = new Set<string>();

      for (const dayDef of DAYS) {
        const day = dayDef.key;
        const daySlots: { a: ScheduleAssignment; s: ScheduleAssignmentSlot; blockIdx: number }[] = [];
        for (const a of assignments) {
          for (const s of a.slots) {
            if (s.classroomId !== room.id || s.dayOfWeek !== day) continue;
            const idx = blockIndexOf(s.startTime, s.endTime);
            if (idx === -1) continue;
            daySlots.push({ a, s, blockIdx: idx });
          }
        }
        daySlots.sort((x, y) => x.blockIdx - y.blockIdx);

        const groups: BlockGroup[] = [];
        let current: BlockGroup | null = null;
        for (const { a, s, blockIdx } of daySlots) {
          occ.add(`${day}|${blockIdx}`);
          if (
            current &&
            current.assignment.assignmentId === a.assignmentId &&
            current.blockStart + current.blockSpan === blockIdx
          ) {
            current.slots.push(s);
            current.blockSpan += 1;
          } else {
            current = { assignment: a, slots: [s], blockStart: blockIdx, blockSpan: 1 };
            groups.push(current);
          }
        }
        if (groups.length) byDay.set(day, groups);
      }
      groupsByClassroom.set(room.id, byDay);
      occupiedByClassroom.set(room.id, occ);
    }

    return {
      classrooms: Array.from(rooms.values()).sort((a, b) => a.code.localeCompare(b.code)),
      groupsByClassroom,
      occupiedByClassroom,
      timeSlotLookup: tsLookup,
    };
  }, [assignments, timeSlots]);

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (classrooms.length === 0) {
      setSelectedId("");
      return;
    }
    if (!classrooms.some((c) => c.id === selectedId)) {
      setSelectedId(classrooms[0].id);
    }
  }, [classrooms, selectedId]);

  if (classrooms.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        <Building2 className="h-6 w-6 opacity-40" />
        Aún no hay aulas con franjas asignadas.
        <span className="text-xs opacity-70">Agrega cursos desde los botones superiores para verlos por aula.</span>
      </div>
    );
  }

  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const dayGroups = groupsByClassroom.get(selected.id) ?? new Map<string, BlockGroup[]>();
  const occupied = occupiedByClassroom.get(selected.id) ?? new Set<string>();
  const totalBlocks = Array.from(dayGroups.values()).reduce(
    (acc, gs) => acc + gs.reduce((a, g) => a + g.blockSpan, 0),
    0,
  );

  // CSS grid row plan: row 1 = header; row 2 + 2*i = block i; row 3 + 2*i = gap after block i.
  const gridTemplateRows = [
    "40px",
    ...BLOCKS.flatMap((_, i) => {
      const blockRow = "minmax(72px, auto)";
      if (i === BLOCKS.length - 1) return [blockRow];
      const gapRow = i === LUNCH_GAP_INDEX ? "28px" : "12px";
      return [blockRow, gapRow];
    }),
  ].join(" ");

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-gradient-to-b from-muted/40 to-muted/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3e8ff] dark:bg-[#6B21A8]/20">
            <Building2 className="h-4 w-4 text-[#6B21A8]" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aula seleccionada
            </p>
            <p className="text-sm font-semibold text-foreground">
              {selected.code} <span className="font-normal text-muted-foreground">· {selected.name}</span>
            </p>
          </div>
        </div>

        <div className="relative ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalBlocks}</span> bloque{totalBlocks !== 1 ? "s" : ""} asignado{totalBlocks !== 1 ? "s" : ""}
          </span>
          <div className="relative">
            <select
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Seleccionar aula"
              className="h-9 w-[240px] cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm font-medium text-foreground shadow-sm transition hover:border-[#6B21A8]/50 focus:border-[#6B21A8] focus:outline-none focus:ring-2 focus:ring-[#6B21A8]/20"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <div
          className="grid w-full gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border"
          style={{
            gridTemplateColumns: `92px repeat(${DAYS.length}, minmax(0, 1fr))`,
            gridTemplateRows,
          }}
        >
          {/* Header row */}
          <div
            className="flex items-center justify-center bg-muted/40 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            Horario
          </div>
          {DAYS.map((d, dIdx) => (
            <div
              key={`hdr-${d.key}`}
              className="flex items-center justify-center bg-muted/40 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ gridColumn: dIdx + 2, gridRow: 1 }}
            >
              <span className="sm:hidden">{d.short}</span>
              <span className="hidden sm:inline">{d.full}</span>
            </div>
          ))}

          {/* Block time-label column */}
          {BLOCKS.map((block, i) => (
            <div
              key={`time-${block.start}`}
              className="flex flex-col items-end justify-center bg-muted/20 px-2 py-2 font-mono text-[11px] leading-tight text-foreground"
              style={{ gridColumn: 1, gridRow: 2 + i * 2 }}
            >
              <span className="font-semibold">{block.start}</span>
              <span className="text-[10px] text-muted-foreground">{block.end}</span>
            </div>
          ))}

          {/* Gap time-label column (between blocks) */}
          {BLOCKS.slice(0, -1).map((_, i) => {
            const isLunch = i === LUNCH_GAP_INDEX;
            return (
              <div
                key={`gaplabel-${i}`}
                className={cn(
                  "flex items-center justify-end gap-1 px-2 text-[9px] font-medium uppercase tracking-wide",
                  isLunch
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    : "bg-muted/10 text-muted-foreground/60",
                )}
                style={{ gridColumn: 1, gridRow: 3 + i * 2 }}
                aria-hidden="true"
              >
                {isLunch ? (
                  <>
                    <Coffee className="h-3 w-3" />
                    <span>Almuerzo</span>
                  </>
                ) : (
                  <span>10 min</span>
                )}
              </div>
            );
          })}

          {/* Per-day gap cells (non-interactive separators) */}
          {BLOCKS.slice(0, -1).map((_, i) =>
            DAYS.map((d, dIdx) => {
              const isLunch = i === LUNCH_GAP_INDEX;
              // Skip if a multi-block card covers this gap in this column
              const coveringGroup = (dayGroups.get(d.key) ?? []).find(
                (g) => g.blockStart <= i && g.blockStart + g.blockSpan - 1 > i,
              );
              if (coveringGroup) return null;

              return (
                <div
                  key={`gap-${d.key}-${i}`}
                  className={cn(
                    "pointer-events-none select-none",
                    isLunch
                      ? "bg-amber-50/60 dark:bg-amber-950/20"
                      : "bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgba(0,0,0,0.04)_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgba(255,255,255,0.03)_4px_8px)]",
                  )}
                  style={{ gridColumn: dIdx + 2, gridRow: 3 + i * 2 }}
                  aria-hidden="true"
                />
              );
            }),
          )}

          {/* Per-day block cells (assignment cards or empty slots) */}
          {DAYS.map((day, dIdx) => {
            const groups = dayGroups.get(day.key) ?? [];
            const nodes: React.ReactNode[] = [];

            for (let bIdx = 0; bIdx < BLOCKS.length; bIdx++) {
              const block = BLOCKS[bIdx];
              const groupHere = groups.find((g) => g.blockStart === bIdx);

              if (groupHere) {
                const a = groupHere.assignment;
                const style = COMPONENT_STYLE[a.componentType] ?? COMPONENT_STYLE.GENERAL;
                const firstSlot = groupHere.slots[0];
                const lastSlot = groupHere.slots[groupHere.slots.length - 1];
                const cssRowStart = 2 + bIdx * 2;
                const cssRowSpan = groupHere.blockSpan * 2 - 1;

                nodes.push(
                  <div
                    key={`cell-${day.key}-${bIdx}`}
                    className="bg-card p-1.5"
                    style={{
                      gridColumn: dIdx + 2,
                      gridRow: `${cssRowStart} / span ${cssRowSpan}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSlotClick(a, firstSlot)}
                      className={cn(
                        "group/card relative flex h-full w-full flex-col gap-1 overflow-hidden rounded-lg border px-3 py-2 text-left transition",
                        "hover:-translate-y-px hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6B21A8]/30 focus:ring-offset-1",
                        style.bg,
                        style.border,
                        style.text,
                      )}
                    >
                      <span className={cn("absolute left-0 top-0 h-full w-1", style.accent)} />
                      <div className="flex items-center justify-between gap-2 pl-1">
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", style.badge)}>
                          {style.label}
                        </span>
                        <span className="font-mono text-[10px] opacity-60">
                          {hhmm(firstSlot.startTime)}–{hhmm(lastSlot.endTime)}
                        </span>
                      </div>
                      <div className="pl-1">
                        <p className="font-mono text-[11px] font-bold leading-tight">{a.courseCode}</p>
                        <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{a.courseName}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pl-1 pt-1">
                        <p className="truncate text-[10px] opacity-75">{a.teacherName}</p>
                        {a.sectionNrc && (
                          <span className="shrink-0 rounded bg-white/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold opacity-70 dark:bg-black/30">
                            NRC {a.sectionNrc}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>,
                );

                bIdx += groupHere.blockSpan - 1;
                continue;
              }

              if (occupied.has(`${day.key}|${bIdx}`)) continue;

              const tsKey = `${day.key}|${block.start}|${block.end}`;
              const ts = timeSlotLookup.get(tsKey);

              nodes.push(
                <div
                  key={`cell-${day.key}-${bIdx}`}
                  className="bg-card p-1.5"
                  style={{ gridColumn: dIdx + 2, gridRow: 2 + bIdx * 2 }}
                >
                  {ts ? (
                    <button
                      type="button"
                      onClick={() => onEmptyCellClick(day.key, ts, selected)}
                      aria-label={`Asignar curso · ${day.full} ${block.start}-${block.end} en ${selected.code}`}
                      className="group/empty flex h-full min-h-[60px] w-full items-center justify-center rounded-lg border border-dashed border-border/70 bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgba(0,0,0,0.015)_6px_12px)] transition hover:border-[#6B21A8]/60 hover:bg-[#f3e8ff]/40 dark:hover:bg-[#6B21A8]/10"
                    >
                      <span className="flex items-center gap-1 text-[10px] font-medium text-[#6B21A8] opacity-0 transition group-hover/empty:opacity-100">
                        <Plus className="h-3.5 w-3.5" />
                        Asignar
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full min-h-[60px] items-center justify-center rounded-lg bg-muted/15 text-[10px] text-muted-foreground/40">
                      —
                    </div>
                  )}
                </div>,
              );
            }
            return nodes;
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Leyenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-violet-400" /> Teoría
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-400" /> Práctica
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-sky-400" /> General
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-dashed border-border" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <Coffee className="h-3 w-3 text-amber-600" /> Receso / Almuerzo
          </span>
        </div>
      </div>
    </section>
  );
}
