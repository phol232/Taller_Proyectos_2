"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Layers, Plus, RefreshCcw, Sparkles } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { getScheduleOptions } from "@/lib/scheduleApi";
import {
  getScheduleAssignments,
  getTimeSlots,
  removeAssignment,
  removeSlot,
} from "@/lib/scheduleBuilderApi";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { ScheduleOption } from "@/types/schedule";
import type {
  ScheduleAssignment,
  ScheduleAssignmentSlot,
  TimeSlot,
} from "@/types/scheduleBuilder";
import ClassroomMatrixView from "@/components/schedule/builder/ClassroomMatrixView";
import SlotDetailDialog from "@/components/schedule/builder/SlotDetailDialog";
import AddCourseDialog, { type AddCourseMode } from "@/components/schedule/builder/AddCourseDialog";
import ModeSelectorDialog from "@/components/schedule/builder/ModeSelectorDialog";

interface PrefilledCell {
  timeSlotId: string;
  classroomId?: string | null;
  classroomCode?: string | null;
  classroomName?: string | null;
}

const DAY_LABEL_FULL: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

function getPeriodLabel(p: AcademicPeriodAdmin) {
  return `${p.code} · ${p.name}`;
}

export default function ScheduleBuilderScreen() {
  const { t } = useTranslation();
  const [academicPeriodId, setAcademicPeriodId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ assignment: ScheduleAssignment; slot: ScheduleAssignmentSlot } | null>(null);
  const [removingSlot, setRemovingSlot] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddCourseMode>("FULL_BOTH");
  const [componentHint, setComponentHint] = useState<"THEORY" | "PRACTICE" | null>(null);
  const [prefilledCell, setPrefilledCell] = useState<PrefilledCell | null>(null);
  const [pendingCell, setPendingCell] = useState<{ cell: PrefilledCell; contextLabel: string } | null>(null);

  const { data: academicPeriods = [] } = useSWR<AcademicPeriodAdmin[]>(
    "/api/academic-periods",
    () => adminApi.listAcademicPeriods(),
  );

  const activePeriods = useMemo(
    () => academicPeriods.filter((p) => p.isActive),
    [academicPeriods],
  );

  const { data: options = [], mutate: refreshOptions } = useSWR<ScheduleOption[]>(
    academicPeriodId ? `/api/schedules/options?academicPeriodId=${academicPeriodId}&builder=1` : null,
    () => getScheduleOptions(academicPeriodId),
  );

  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    mutate: refreshAssignments,
  } = useSWR<ScheduleAssignment[]>(
    scheduleId ? `builder-assignments-${scheduleId}` : null,
    () => getScheduleAssignments(scheduleId),
    { keepPreviousData: true },
  );

  const { data: rawTimeSlots = [] } = useSWR<TimeSlot[]>(
    scheduleId ? "builder-time-slots" : null,
    () => getTimeSlots(),
  );

  // Solo mostrar franjas dentro del horario académico diurno (07:00 - 22:30)
  const timeSlots = useMemo(
    () => rawTimeSlots.filter((ts) => ts.startTime >= "07:00" && ts.endTime <= "22:30"),
    [rawTimeSlots],
  );

  useAdminEvents("schedules.changed", () => {
    void refreshOptions();
    void refreshAssignments();
  });

  useEffect(() => {
    if (!academicPeriodId && activePeriods.length > 0) {
      setAcademicPeriodId(activePeriods[0].id);
    }
  }, [academicPeriodId, activePeriods]);

  useEffect(() => {
    if (options.length > 0 && !options.some((o) => o.id === scheduleId)) {
      const confirmed = options.find((o) => o.status === "CONFIRMED");
      setScheduleId((confirmed ?? options[0]).id);
    } else if (options.length === 0) {
      setScheduleId("");
    }
  }, [options, scheduleId]);

  async function handleRemoveSlot() {
    if (!selectedSlot) return;
    setRemovingSlot(true);
    try {
      const result = await removeSlot(selectedSlot.slot.slotId);
      toastSuccess(
        "Franja eliminada",
        result.assignmentLeftIncomplete
          ? `La asignación quedó con ${Number(result.assignedHours).toFixed(1)} h de ${Number(result.requiredHours).toFixed(1)} h requeridas.`
          : undefined,
      );
      setSelectedSlot(null);
      await refreshAssignments();
    } catch (error) {
      toastError("No se pudo quitar la franja", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setRemovingSlot(false);
    }
  }

  async function handleRemoveAssignmentFromDialog() {
    if (!selectedSlot) return;
    setRemovingSlot(true);
    try {
      await removeAssignment(selectedSlot.assignment.assignmentId);
      toastSuccess("Asignación eliminada");
      setSelectedSlot(null);
      await refreshAssignments();
    } catch (error) {
      toastError("No se pudo eliminar la asignación", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setRemovingSlot(false);
    }
  }

  function openAddCourse(mode: AddCourseMode, prefill?: PrefilledCell | null, hint?: "THEORY" | "PRACTICE" | null) {
    setAddMode(mode);
    setPrefilledCell(prefill ?? null);
    setComponentHint(hint ?? null);
    setAddCourseOpen(true);
  }

  function handleEmptyCellByClassroom(day: string, ts: TimeSlot, classroom: { id: string; code: string; name: string }) {
    setPendingCell({
      cell: {
        timeSlotId: ts.id,
        classroomId: classroom.id,
        classroomCode: classroom.code,
        classroomName: classroom.name,
      },
      contextLabel: `${DAY_LABEL_FULL[day] ?? day} · ${ts.startTime.slice(0, 5)}–${ts.endTime.slice(0, 5)} · aula ${classroom.code}`,
    });
  }

  function handleModePick(mode: AddCourseMode, hint?: "THEORY" | "PRACTICE") {
    if (!pendingCell) return;
    openAddCourse(mode, pendingCell.cell, hint ?? null);
    setPendingCell(null);
  }

  return (
    <PageShell
      title={t.subpages.builderSchedule.title}
      description={t.subpages.builderSchedule.desc}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-3 px-5 py-4">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Período académico</label>
              <select
                value={academicPeriodId}
                onChange={(e) => setAcademicPeriodId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
              >
                {activePeriods.length === 0 && <option value="">Sin períodos activos</option>}
                {activePeriods.map((p) => (
                  <option key={p.id} value={p.id}>{getPeriodLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Horario</label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                disabled={options.length === 0}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
              >
                {options.length === 0 && <option value="">Sin horarios disponibles</option>}
                {options
                  .filter((o) => o.status !== "CANCELLED")
                  .map((o, idx) => (
                    <option key={o.id} value={o.id}>
                      {o.status === "CONFIRMED" ? "✓ " : ""}Opción {idx + 1} · {o.offerCount} cursos · {o.slotCount} bloques
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void refreshAssignments()}
              disabled={!scheduleId}
              className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground ring-1 ring-border transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>

          {scheduleId && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{assignments.length}</span> asignación(es) ·{" "}
                <span className="font-semibold text-foreground">
                  {assignments.reduce((sum, a) => sum + a.slots.length, 0)}
                </span>{" "}
                franja(s) ·{" "}
                <span className={cn("font-semibold", assignments.every((a) => a.complete) ? "text-emerald-600" : "text-amber-600")}>
                  {assignments.filter((a) => a.complete).length}/{assignments.length}
                </span>{" "}
                completas
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openAddCourse("FULL_BOTH")}
                  className="h-8 rounded-lg bg-[#6B21A8] text-xs font-semibold text-white hover:bg-[#581C87]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Teoría + Práctica
                </Button>
                <Button
                  type="button"
                  onClick={() => openAddCourse("FULL")}
                  className="h-8 rounded-lg bg-foreground text-xs font-semibold text-background hover:bg-foreground/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Un componente
                </Button>
                <Button
                  type="button"
                  onClick={() => openAddCourse("GENERAL")}
                  className="h-8 rounded-lg bg-muted text-xs font-semibold text-foreground ring-1 ring-border hover:bg-muted/80"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Curso general
                </Button>
              </div>
            </div>
          )}
        </section>

        {!scheduleId ? (
          <section className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Selecciona un período y un horario para empezar a editar.
          </section>
        ) : assignmentsLoading ? (
          <div className="h-[300px] animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <ClassroomMatrixView
            assignments={assignments}
            timeSlots={timeSlots}
            onSlotClick={(assignment, slot) => setSelectedSlot({ assignment, slot })}
            onEmptyCellClick={handleEmptyCellByClassroom}
          />
        )}
      </div>

      <SlotDetailDialog
        open={selectedSlot !== null}
        onOpenChange={(o) => !o && setSelectedSlot(null)}
        assignment={selectedSlot?.assignment ?? null}
        slot={selectedSlot?.slot ?? null}
        removing={removingSlot}
        onRemoveSlotOnly={handleRemoveSlot}
        onRemoveAssignment={handleRemoveAssignmentFromDialog}
      />

      <ModeSelectorDialog
        open={pendingCell !== null}
        onOpenChange={(o) => !o && setPendingCell(null)}
        onPick={handleModePick}
        contextLabel={pendingCell?.contextLabel ?? null}
      />

      {scheduleId && (
        <AddCourseDialog
          open={addCourseOpen}
          onOpenChange={(o) => {
            setAddCourseOpen(o);
            if (!o) {
              setPrefilledCell(null);
              setComponentHint(null);
            }
          }}
          scheduleId={scheduleId}
          mode={addMode}
          prefilledCell={prefilledCell}
          componentHint={componentHint}
          onAdded={() => void refreshAssignments()}
        />
      )}
    </PageShell>
  );
}
