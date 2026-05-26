"use client";

import { useMemo, useState } from "react";
import { BookOpen, Building2, Clock, Coffee, GraduationCap, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PendingCourseSection, StudentPendingCourse } from "@/types/studentSchedule";

const DAYS: { key: string; short: string; full: string }[] = [
  { key: "MONDAY", short: "Lun", full: "Lunes" },
  { key: "TUESDAY", short: "Mar", full: "Martes" },
  { key: "WEDNESDAY", short: "Mié", full: "Miércoles" },
  { key: "THURSDAY", short: "Jue", full: "Jueves" },
  { key: "FRIDAY", short: "Vie", full: "Viernes" },
  { key: "SATURDAY", short: "Sáb", full: "Sábado" },
  { key: "SUNDAY", short: "Dom", full: "Domingo" },
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

interface BlockGroup {
  componentType: string;
  teacherName: string;
  teacherCode: string;
  classroomCode: string;
  classroomName: string;
  dayKey: string;
  dayLabel: string;
  blockStart: number;
  blockSpan: number;
  firstStart: string;
  lastEnd: string;
}

interface Props {
  course: StudentPendingCourse;
  section: PendingCourseSection;
}

export default function NrcScheduleView({ course, section }: Props) {
  const [activeBlock, setActiveBlock] = useState<BlockGroup | null>(null);

  const groupsByDay = useMemo(() => {
    const map = new Map<string, BlockGroup[]>();

    for (const day of DAYS) {
      const daySlots: { comp: typeof section.components[number]; slot: typeof section.components[number]["slots"][number]; blockIdx: number }[] = [];
      for (const comp of section.components) {
        for (const slot of comp.slots) {
          if (slot.dayOfWeek !== day.key) continue;
          const idx = blockIndexOf(slot.startTime, slot.endTime);
          if (idx === -1) continue;
          daySlots.push({ comp, slot, blockIdx: idx });
        }
      }
      daySlots.sort((a, b) => a.blockIdx - b.blockIdx);

      const groups: BlockGroup[] = [];
      let current: BlockGroup | null = null;
      for (const { comp, slot, blockIdx } of daySlots) {
        if (
          current &&
          current.componentType === comp.componentType &&
          current.teacherName === comp.teacherName &&
          current.classroomCode === slot.classroomCode &&
          current.blockStart + current.blockSpan === blockIdx
        ) {
          current.blockSpan += 1;
          current.lastEnd = hhmm(slot.endTime);
        } else {
          current = {
            componentType: comp.componentType,
            teacherName: comp.teacherName,
            teacherCode: comp.teacherCode,
            classroomCode: slot.classroomCode,
            classroomName: slot.classroomName,
            dayKey: day.key,
            dayLabel: day.full,
            blockStart: blockIdx,
            blockSpan: 1,
            firstStart: hhmm(slot.startTime),
            lastEnd: hhmm(slot.endTime),
          };
          groups.push(current);
        }
      }
      if (groups.length) map.set(day.key, groups);
    }
    return map;
  }, [section]);

  const occupiedByDay = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const [day, groups] of groupsByDay.entries()) {
      const occ = new Set<number>();
      for (const g of groups) {
        for (let i = 0; i < g.blockSpan; i++) occ.add(g.blockStart + i);
      }
      map.set(day, occ);
    }
    return map;
  }, [groupsByDay]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {section.components.map((comp) => {
          const style = COMPONENT_STYLE[comp.componentType] ?? COMPONENT_STYLE.GENERAL;
          return (
            <span
              key={comp.assignmentId}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                style.bg,
                style.border,
                style.text,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", style.accent)} />
              <span className="font-semibold">{style.label}</span>
              <span className="opacity-70">·</span>
              <span>{comp.teacherName}</span>
            </span>
          );
        })}
      </div>

      <div
        className="grid w-full gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border"
        style={{
          gridTemplateColumns: `92px repeat(${DAYS.length}, minmax(0, 1fr))`,
          gridTemplateRows,
        }}
      >
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

        {BLOCKS.slice(0, -1).map((_, i) =>
          DAYS.map((d, dIdx) => {
            const isLunch = i === LUNCH_GAP_INDEX;
            const groups = groupsByDay.get(d.key) ?? [];
            const covering = groups.find((g) => g.blockStart <= i && g.blockStart + g.blockSpan - 1 > i);
            if (covering) return null;
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

        {DAYS.map((day, dIdx) => {
          const groups = groupsByDay.get(day.key) ?? [];
          const occupied = occupiedByDay.get(day.key) ?? new Set<number>();
          const nodes: React.ReactNode[] = [];

          for (let bIdx = 0; bIdx < BLOCKS.length; bIdx++) {
            const groupHere = groups.find((g) => g.blockStart === bIdx);

            if (groupHere) {
              const style = COMPONENT_STYLE[groupHere.componentType] ?? COMPONENT_STYLE.GENERAL;
              const cssRowStart = 2 + bIdx * 2;
              const cssRowSpan = groupHere.blockSpan * 2 - 1;

              nodes.push(
                <div
                  key={`cell-${day.key}-${bIdx}`}
                  className="bg-card p-1.5"
                  style={{ gridColumn: dIdx + 2, gridRow: `${cssRowStart} / span ${cssRowSpan}` }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveBlock(groupHere)}
                    title="Ver detalle de la franja"
                    className={cn(
                      "relative flex h-full w-full flex-col gap-1 overflow-hidden rounded-lg border px-3 py-2 text-left transition",
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
                        {groupHere.firstStart}–{groupHere.lastEnd}
                      </span>
                    </div>
                    <div className="pl-1">
                      <p className="font-mono text-[11px] font-bold leading-tight">{course.courseCode}</p>
                      <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{course.courseName}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pl-1 pt-1">
                      <p className="truncate text-[10px] opacity-75">{groupHere.teacherName}</p>
                      <span className="shrink-0 rounded bg-white/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold opacity-70 dark:bg-black/30">
                        {groupHere.classroomCode}
                      </span>
                    </div>
                  </button>
                </div>,
              );

              bIdx += groupHere.blockSpan - 1;
              continue;
            }

            if (occupied.has(bIdx)) continue;

            nodes.push(
              <div
                key={`cell-${day.key}-${bIdx}`}
                className="bg-card p-1.5"
                style={{ gridColumn: dIdx + 2, gridRow: 2 + bIdx * 2 }}
              >
                <div className="flex h-full min-h-[60px] items-center justify-center rounded-lg bg-muted/15 text-[10px] text-muted-foreground/40">
                  —
                </div>
              </div>,
            );
          }
          return nodes;
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
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
          <Coffee className="h-3 w-3 text-amber-600" /> Receso / Almuerzo
        </span>
        <span className="ml-auto italic opacity-70">Haz clic en una franja para ver el detalle.</span>
      </div>

      <BlockDetailDialog
        block={activeBlock}
        course={course}
        section={section}
        onClose={() => setActiveBlock(null)}
      />
    </div>
  );
}

function BlockDetailDialog({
  block,
  course,
  section,
  onClose,
}: {
  block: BlockGroup | null;
  course: StudentPendingCourse;
  section: PendingCourseSection;
  onClose: () => void;
}) {
  const open = !!block;
  const style = block ? (COMPONENT_STYLE[block.componentType] ?? COMPONENT_STYLE.GENERAL) : null;
  const durationMin = block ? block.blockSpan * 90 : 0;
  const hours = block ? (durationMin / 60).toFixed(durationMin % 60 === 0 ? 0 : 1) : "0";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[min(94vw,560px)]">
        {block && style && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style.badge)}>
                  {style.label}
                </span>
                <DialogTitle className="text-base">
                  {course.courseCode} · {course.courseName}
                </DialogTitle>
              </div>
              <DialogDescription>
                NRC {section.nrc ?? "—"}
                {section.sectionNumber != null && ` · Sección ${section.sectionNumber}`}
              </DialogDescription>
            </DialogHeader>

            <div className={cn("rounded-xl border p-4", style.bg, style.border)}>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Día y horario">
                  <span className="font-semibold text-foreground">{block.dayLabel}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="font-mono">{block.firstStart} – {block.lastEnd}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({hours} h efectivas)</span>
                </DetailRow>
                <DetailRow icon={<User className="h-4 w-4" />} label="Docente">
                  <span className="font-medium text-foreground">{block.teacherName}</span>
                  {block.teacherCode && (
                    <span className="ml-2 text-xs text-muted-foreground">· {block.teacherCode}</span>
                  )}
                </DetailRow>
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Aula">
                  <span className="font-semibold text-foreground">{block.classroomCode}</span>
                  {block.classroomName && (
                    <span className="ml-2 text-xs text-muted-foreground">· {block.classroomName}</span>
                  )}
                </DetailRow>
                <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Curso">
                  <span className="text-foreground">Ciclo {course.courseCycle}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-foreground">{course.courseCredits} créditos</span>
                </DetailRow>
                <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Componente">
                  <span className="text-foreground">{style.label}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-foreground">{block.blockSpan} bloque{block.blockSpan !== 1 ? "s" : ""} pedagógico{block.blockSpan !== 1 ? "s" : ""}</span>
                </DetailRow>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-muted-foreground dark:bg-black/30">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm leading-snug">{children}</div>
      </div>
    </div>
  );
}
