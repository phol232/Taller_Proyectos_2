"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConflictBadge from "@/components/schedule/ConflictBadge";
import { useScheduleValidation } from "@/hooks/useScheduleValidation";
import type { Assignment, Conflict } from "@/types/schedule";
import type { StudentPendingCourse } from "@/types/studentSchedule";
import { validateStudentBuilderCourse } from "@/lib/studentScheduleBuilderApi";

interface AddStudentCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: StudentPendingCourse | null;
  studentId: string;
  scheduleId: string;
  creditLimit: number;
  currentTotalCredits: number;
  currentAssignments: Assignment[];
  approvedCourseIds: string[];
  onAdded: () => void;
  onConfirmAdd: (courseId: string, assignmentIds: string[]) => Promise<void>;
}

export default function AddStudentCourseDialog({
  open,
  onOpenChange,
  course,
  studentId,
  scheduleId,
  creditLimit,
  currentTotalCredits,
  currentAssignments,
  approvedCourseIds,
  onAdded,
  onConfirmAdd,
}: AddStudentCourseDialogProps) {
  const { validate } = useScheduleValidation();
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [localConflicts, setLocalConflicts] = useState<Conflict[]>([]);
  const [serverConflicts, setServerConflicts] = useState<Conflict[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedSection = useMemo(
    () => course?.sections.find((s) => s.sectionId === selectedSectionId) ?? null,
    [course, selectedSectionId],
  );

  const prerequisitesMet = useMemo(
    () => course?.prerequisites.every((p) => p.isSatisfied) ?? true,
    [course],
  );

  useEffect(() => {
    if (!open) {
      setSelectedSectionId("");
      setLocalConflicts([]);
      setServerConflicts([]);
    }
  }, [open, course?.courseId]);

  useEffect(() => {
    if (!course || !selectedSection) {
      setLocalConflicts([]);
      setServerConflicts([]);
      return;
    }

    const assignmentIds = selectedSection.components.map((c) => c.assignmentId);
    const vacancies = selectedSection.availableVacancies ?? 0;
    const prerequisiteIds = course.prerequisites
      .filter((p) => !p.isSatisfied)
      .map((p) => p.prerequisiteCode);

    const allConflicts: Conflict[] = [];

    for (const comp of selectedSection.components) {
      for (const slot of comp.slots) {
        const slotConflicts = validate({
          newCourseId: course.courseId,
          newTimeSlot: {
            day: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
          newCredits: course.courseCredits,
          prerequisites: prerequisiteIds,
          approvedCourses: approvedCourseIds,
          currentAssignments,
          currentTotalCredits,
          creditLimit,
          vacancies,
        });
        allConflicts.push(...slotConflicts);
      }
    }

    const unique = allConflicts.filter(
      (c, i, arr) => arr.findIndex((x) => x.type === c.type && x.message === c.message) === i,
    );
    setLocalConflicts(unique);

    void validateStudentBuilderCourse(
      studentId,
      scheduleId,
      course.courseId,
      assignmentIds,
    ).then(setServerConflicts).catch(() => setServerConflicts([]));
  }, [
    course,
    selectedSection,
    studentId,
    scheduleId,
    validate,
    currentAssignments,
    currentTotalCredits,
    creditLimit,
    approvedCourseIds,
  ]);

  const conflicts = useMemo(() => {
    const merged = [...localConflicts, ...serverConflicts];
    return merged.filter(
      (c, i, arr) => arr.findIndex((x) => x.type === c.type && x.message === c.message) === i,
    );
  }, [localConflicts, serverConflicts]);

  const canAdd = selectedSection && conflicts.length === 0 && prerequisitesMet;

  const handleAdd = async () => {
    if (!course || !selectedSection || !canAdd) return;
    setSubmitting(true);
    try {
      const assignmentIds = selectedSection.components.map((c) => c.assignmentId);
      await onConfirmAdd(course.courseId, assignmentIds);
      onAdded();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {course.courseCode} · {course.courseName}
          </DialogTitle>
          <DialogDescription>
            Selecciona una sección (NRC). Se validan prerrequisitos, créditos, vacantes y solapamientos.
          </DialogDescription>
        </DialogHeader>

        {!prerequisitesMet && (
          <p className="text-sm text-ship-red">
            Prerrequisitos faltantes:{" "}
            {course.prerequisites.filter((p) => !p.isSatisfied).map((p) => p.prerequisiteCode).join(", ")}
          </p>
        )}

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {course.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay secciones publicadas para este curso.</p>
          ) : (
            course.sections.map((section) => {
              const noVacancy = (section.availableVacancies ?? 0) <= 0;
              const label = section.nrc
                ? `NRC ${section.nrc}${section.sectionNumber != null ? ` · Sec. ${section.sectionNumber}` : ""}`
                : `Sección ${section.sectionNumber ?? "—"}`;
              return (
                <label
                  key={section.sectionId}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    selectedSectionId === section.sectionId ? "border-[#6B21A8] bg-violet-50/50" : "border-border"
                  } ${noVacancy ? "opacity-50" : ""}`}
                  title={noVacancy ? "Sin vacantes disponibles" : undefined}
                >
                  <input
                    type="radio"
                    name="section"
                    value={section.sectionId}
                    checked={selectedSectionId === section.sectionId}
                    disabled={noVacancy || !prerequisitesMet}
                    onChange={() => setSelectedSectionId(section.sectionId)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      Cupo: {section.availableVacancies ?? "—"} · {section.components.length} componente(s)
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {conflicts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {conflicts.map((c, i) => (
              <ConflictBadge key={`${c.type}-${i}`} conflict={c} />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canAdd || submitting}
            onClick={handleAdd}
            className="bg-[#6B21A8] text-white hover:bg-[#581c87]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar al horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
