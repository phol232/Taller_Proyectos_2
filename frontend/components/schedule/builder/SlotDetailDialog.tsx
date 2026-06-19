"use client";

import { useState } from "react";
import { AlertTriangle, Building2, Clock, Hash, Loader2, Trash2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import type { ScheduleAssignment, ScheduleAssignmentSlot } from "@/types/scheduleBuilder";

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

const COMPONENT_BADGE_STYLE: Record<string, string> = {
  THEORY: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  PRACTICE: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  GENERAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
};

function hhmm(t: string) {
  return t.slice(0, 5);
}

function minutes(hhmmStr: string): number {
  const [h, m] = hhmmStr.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// Encuentra el grupo contiguo (en el mismo día) que contiene el slot clickeado.
// Dos franjas son contiguas si la siguiente arranca <=30 min después de que la
// anterior termina (10 min de descanso institucional o 30 min de almuerzo).
function contiguousGroup(
  allSlots: ScheduleAssignmentSlot[],
  clicked: ScheduleAssignmentSlot,
): ScheduleAssignmentSlot[] {
  const sameDay = allSlots
    .filter((s) => s.dayOfWeek === clicked.dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const groups: ScheduleAssignmentSlot[][] = [];
  let current: ScheduleAssignmentSlot[] = [];
  for (const s of sameDay) {
    if (current.length === 0) {
      current.push(s);
      continue;
    }
    const prev = current[current.length - 1];
    if (minutes(s.startTime) - minutes(prev.endTime) <= 30) current.push(s);
    else {
      groups.push(current);
      current = [s];
    }
  }
  if (current.length) groups.push(current);
  return groups.find((g) => g.some((s) => s.slotId === clicked.slotId)) ?? [clicked];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: ScheduleAssignment | null;
  slot: ScheduleAssignmentSlot | null;
  removing: boolean;
  onRemoveSlotOnly: () => Promise<void>;
  onRemoveAssignment: () => Promise<void>;
}

export default function SlotDetailDialog({
  open,
  onOpenChange,
  assignment,
  slot,
  removing,
  onRemoveSlotOnly,
  onRemoveAssignment,
}: Props) {
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);

  if (!assignment || !slot) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const totalSlots = assignment.slots.length;
  const slotHours = 1.5;
  const remainingHours = Number(assignment.assignedHours) - slotHours;
  const wouldBeIncomplete = remainingHours < Number(assignment.componentWeeklyHours);
  const isLastSlot = totalSlots <= 1;
  const componentType = assignment.componentType;
  const badgeStyle = COMPONENT_BADGE_STYLE[componentType] ?? COMPONENT_BADGE_STYLE.GENERAL;

  const group = contiguousGroup(assignment.slots, slot);
  const groupStart = group[0].startTime;
  const groupEnd = group[group.length - 1].endTime;
  const groupHours = (minutes(groupEnd) - minutes(groupStart)) / 60;
  const isMultiSlot = group.length > 1;

  async function handleRemove() {
    if (wouldBeIncomplete || isLastSlot) {
      setConfirmIncomplete(true);
      return;
    }
    await onRemoveSlotOnly();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyle}`}>
                {COMPONENT_LABEL[componentType] ?? componentType}
              </span>
              {assignment.complete ? (
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900">
                  Componente completo
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-px text-[10px] font-medium text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-900">
                  Componente incompleto
                </span>
              )}
            </div>
            <DialogTitle className="mt-2 text-base">
              {assignment.courseCode} · {assignment.courseName}
            </DialogTitle>
            <DialogDescription>
              {DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek} · {hhmm(groupStart)} – {hhmm(groupEnd)}
              {isMultiSlot && (
                <span className="ml-1 text-muted-foreground">
                  ({groupHours.toFixed(1)} h · {group.length} franjas)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 px-1 pb-1">
            <Row icon={<Clock className="h-3.5 w-3.5" />} label="Horario">
              <div>
                {DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek} ·{" "}
                <span className="font-semibold">{hhmm(groupStart)} – {hhmm(groupEnd)}</span>
                {isMultiSlot && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({groupHours.toFixed(1)} h)
                  </span>
                )}
              </div>
              {isMultiSlot && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Bloques: {group.map((s) => `${hhmm(s.startTime)}–${hhmm(s.endTime)}`).join(" · ")}
                </p>
              )}
            </Row>
            <Row icon={<User className="h-3.5 w-3.5" />} label="Docente">
              <span className="font-semibold">{assignment.teacherName}</span>
              <span className="ml-1 text-muted-foreground">· {assignment.teacherCode}</span>
            </Row>
            <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Aula">
              <span className="font-semibold">{slot.classroomCode}</span>
              <span className="ml-1 text-muted-foreground">· {slot.classroomName}</span>
            </Row>
            {assignment.sectionNrc && (
              <Row icon={<Hash className="h-3.5 w-3.5" />} label="NRC">
                <span className="font-mono">{assignment.sectionNrc}</span>
              </Row>
            )}

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Carga del componente
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {Number(assignment.assignedHours).toFixed(1)} / {Number(assignment.componentWeeklyHours).toFixed(1)} h
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  ({totalSlots} {totalSlots === 1 ? "franja" : "franjas"})
                </span>
              </p>
            </div>

            {(wouldBeIncomplete || isLastSlot) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  Si quitas esta franja, el componente quedará sin las horas requeridas.
                  Te pediremos confirmación para eliminar la asignación completa.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="w-full rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {removing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
              Quitar franja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmIncomplete}
        onOpenChange={(o) => !o && setConfirmIncomplete(false)}
        title="Eliminar asignación completa"
        description={
          isLastSlot
            ? `Esta es la única franja del componente "${COMPONENT_LABEL[componentType] ?? componentType}" de ${assignment.courseCode}. Al quitarla se eliminará la asignación completa del curso. ¿Continuar?`
            : `Quitar esta franja dejará incompleto el componente "${COMPONENT_LABEL[componentType] ?? componentType}" de ${assignment.courseCode} (${remainingHours.toFixed(1)} h restantes / ${Number(assignment.componentWeeklyHours).toFixed(1)} h requeridas). Se eliminará la asignación completa con todas sus franjas. ¿Continuar?`
        }
        confirmLabel="Eliminar asignación completa"
        variant="destructive"
        isLoading={removing}
        onConfirm={() => {
          void onRemoveAssignment().finally(() => setConfirmIncomplete(false));
        }}
      />
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-foreground">{children}</p>
      </div>
    </div>
  );
}
