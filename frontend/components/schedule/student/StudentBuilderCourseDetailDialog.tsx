"use client";

import { useMemo } from "react";
import { Building2, GraduationCap, Hash, Trash2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimetableSlot } from "@/types/schedule";
import type { StudentBuilderCourseItem } from "@/types/studentSchedule";

const DAY_LABEL: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const COMPONENT_LABEL: Record<string, string> = {
  THEORY: "Teoría",
  PRACTICE: "Práctica",
  GENERAL: "General",
};

const COMPONENT_BADGE: Record<string, string> = {
  THEORY: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  PRACTICE: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  GENERAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
};

function fmt(time: string) {
  return time.slice(0, 5);
}

function normalizeComponentType(type: string): string {
  return type.trim().toUpperCase();
}

function componentLabel(type: string): string {
  return COMPONENT_LABEL[normalizeComponentType(type)] ?? type;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StudentBuilderCourseItem | null;
  slots: TimetableSlot[];
  mode?: "edit" | "readonly";
  onRequestRemove?: () => void;
}

export default function StudentBuilderCourseDetailDialog({
  open,
  onOpenChange,
  item,
  slots,
  mode = "edit",
  onRequestRemove,
}: Props) {
  const courseSlots = useMemo(
    () =>
      slots
        .filter((s) => item && s.courseId === item.courseId)
        .sort((a, b) => {
          const dayCmp = a.dayOfWeek.localeCompare(b.dayOfWeek);
          return dayCmp !== 0 ? dayCmp : a.startTime.localeCompare(b.startTime);
        }),
    [slots, item],
  );

  const enrolledComponents = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const slot of courseSlots) {
      const key = normalizeComponentType(slot.componentType);
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(componentLabel(slot.componentType));
    }
    if (labels.length > 0) return labels;

    const fromItem = new Set<string>();
    for (const c of item?.components ?? []) {
      const label = componentLabel(c.componentType);
      if (!fromItem.has(label)) {
        fromItem.add(label);
        labels.push(label);
      }
    }
    return labels;
  }, [courseSlots, item]);

  const nrcSummary = useMemo(() => {
    const nrcs = [...new Set(courseSlots.map((s) => s.nrc).filter(Boolean))] as string[];
    if (nrcs.length === 0) return item?.nrc ? `NRC ${item.nrc}` : "Sin NRC";
    if (nrcs.length === 1) return `NRC ${nrcs[0]}`;
    return `NRC ${nrcs.join(" · ")}`;
  }, [courseSlots, item]);

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item.courseCode} · {item.courseName}
          </DialogTitle>
          <DialogDescription>
            {nrcSummary}
            {item.sectionNumber != null && nrcSummary.indexOf("·") === -1 && ` · Sección ${item.sectionNumber}`}
            {" · "}
            {item.courseCredits} créditos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {courseSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin bloques horarios cargados.</p>
          ) : (
            courseSlots.map((slot) => {
              const compKey = normalizeComponentType(slot.componentType);
              return (
                <div
                  key={slot.slotId}
                  className="rounded-xl border border-border bg-muted/30 p-3 text-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        COMPONENT_BADGE[compKey] ?? COMPONENT_BADGE.GENERAL,
                      )}
                    >
                      {componentLabel(slot.componentType)}
                    </span>
                    <span className="font-medium text-foreground">
                      {DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmt(slot.startTime)} – {fmt(slot.endTime)}
                    </span>
                  </div>
                  <div className="grid gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{slot.teacherName}</span>
                      {slot.teacherCode && <span>· {slot.teacherCode}</span>}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{slot.classroomCode}</span>
                      {slot.classroomName && <span>· {slot.classroomName}</span>}
                    </p>
                    {slot.nrc && (
                      <p className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        NRC {slot.nrc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {enrolledComponents.length > 0 && (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                Componentes matriculados
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {enrolledComponents.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {mode === "edit" && onRequestRemove && (
          <DialogFooter className="mt-2 gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                onOpenChange(false);
                onRequestRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Quitar curso
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
