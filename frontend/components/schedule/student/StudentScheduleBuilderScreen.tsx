"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import WeeklyGrid from "@/components/schedule/WeeklyGrid";
import AddStudentCourseDialog from "@/components/schedule/student/AddStudentCourseDialog";
import StudentBuilderCourseDetailDialog from "@/components/schedule/student/StudentBuilderCourseDetailDialog";
import { adminApi } from "@/lib/adminApi";
import {
  confirmStudentScheduleOption,
  getCurrentStudent,
  getStudentAvailableCourses,
  getStudentOptionTimetable,
  renewStudentScheduleOption,
} from "@/lib/studentScheduleApi";
import {
  addStudentBuilderCourse,
  ensureStudentBuilderDraft,
  getStudentBuilderDraft,
  importStudentBuilderFromOption,
  removeStudentBuilderCourse,
  renewStudentBuilderDraft,
} from "@/lib/studentScheduleBuilderApi";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { Assignment, TimetableSlot } from "@/types/schedule";
import type { StudentBuilderDraft, StudentMe, StudentPendingCourse } from "@/types/studentSchedule";

function formatPeriod(p: AcademicPeriodAdmin) {
  return `${p.code} · ${p.name}`;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StudentScheduleBuilderScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const [periodId, setPeriodId] = useState(() => search.get("periodId") ?? "");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [addCourse, setAddCourse] = useState<StudentPendingCourse | null>(null);
  const [courseToView, setCourseToView] = useState<string | null>(null);
  const [courseToRemove, setCourseToRemove] = useState<string | null>(null);
  const [removingCourse, setRemovingCourse] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const importSourceId = search.get("importFrom");
  const urlScheduleId = search.get("scheduleId");
  const waitingImport = Boolean(importSourceId && !urlScheduleId);

  const { data: me } = useSWR<StudentMe>("/api/students/me", () => getCurrentStudent());
  const { data: periods = [] } = useSWR("/api/academic-periods", () => adminApi.listAcademicPeriods());
  const activePeriods = useMemo(
    () => (periods as AcademicPeriodAdmin[]).filter((p) => p.isActive),
    [periods],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const draftKey =
    me && !waitingImport && (urlScheduleId || periodId)
      ? `builder-draft-${me.id}-${urlScheduleId ?? periodId}`
      : null;
  const {
    data: draft,
    mutate: mutateDraft,
    isLoading: draftLoading,
  } = useSWR<StudentBuilderDraft | null>(
    draftKey,
    async () => {
      if (!me) return null;
      if (urlScheduleId) {
        return getStudentBuilderDraft(me.id, { scheduleId: urlScheduleId });
      }
      let d = await getStudentBuilderDraft(me.id, periodId);
      if (!d) {
        await ensureStudentBuilderDraft(me.id, periodId);
        d = await getStudentBuilderDraft(me.id, periodId);
      }
      return d;
    },
    { revalidateOnFocus: false },
  );

  const activeScheduleId = draft?.scheduleId ?? scheduleId;

  useEffect(() => {
    if (draft?.scheduleId) {
      setScheduleId(draft.scheduleId);
    }
  }, [draft?.scheduleId]);

  const coursesKey = me && periodId ? `pending-${me.id}-${periodId}` : null;
  const { data: pendingCourses = [] } = useSWR<StudentPendingCourse[]>(
    coursesKey,
    () => getStudentAvailableCourses(me!.id, periodId),
  );

  const timetableKey = me && activeScheduleId ? `builder-timetable-${activeScheduleId}` : null;
  const { data: timetable = [], mutate: mutateTimetable, isLoading: timetableLoading } = useSWR<TimetableSlot[]>(
    timetableKey,
    () => getStudentOptionTimetable(me!.id, activeScheduleId!),
  );

  // Recupera la grilla si el borrador tiene cursos pero el timetable quedó vacío (cache/race).
  useEffect(() => {
    if (!me || !activeScheduleId || timetableLoading) return;
    if ((draft?.items.length ?? 0) > 0 && timetable.length === 0) {
      void mutateTimetable(
        () => getStudentOptionTimetable(me.id, activeScheduleId),
        { revalidate: false },
      );
    }
  }, [me, activeScheduleId, draft?.items.length, timetable.length, timetableLoading, mutateTimetable]);

  const coursesInDraft = useMemo(
    () => new Set((draft?.items ?? []).map((i) => i.courseId)),
    [draft],
  );

  const availableCourses = useMemo(
    () => pendingCourses.filter((c) => !coursesInDraft.has(c.courseId)),
    [pendingCourses, coursesInDraft],
  );

  const approvedCourseIds = useMemo(() => {
    const completed = new Set<string>();
    for (const c of pendingCourses) {
      for (const p of c.prerequisites) {
        if (p.isSatisfied) completed.add(p.prerequisiteCourseId);
      }
    }
    return Array.from(completed);
  }, [pendingCourses]);

  const currentAssignments = useMemo((): Assignment[] => {
    return timetable.map((slot, idx) => ({
      id: slot.slotId ?? `slot-${idx}`,
      courseId: slot.courseId,
      courseName: slot.courseName,
      courseCode: slot.courseCode,
      teacherId: slot.teacherId,
      teacherName: slot.teacherName,
      classroomId: slot.classroomId,
      classroomCode: slot.classroomCode,
      timeSlot: {
        day: slot.dayOfWeek,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
      },
    }));
  }, [timetable]);

  const secondsRemaining = useMemo(() => {
    if (!draft?.expiresAt) return draft?.secondsRemaining ?? 0;
    return Math.max(0, Math.floor((Date.parse(draft.expiresAt) - now) / 1000));
  }, [draft, now]);

  const handleImport = useCallback(async () => {
    if (!me || !periodId || !importSourceId) return;
    setInitializing(true);
    try {
      const id = await importStudentBuilderFromOption(me.id, periodId, importSourceId);
      setScheduleId(id);
      const [freshDraft, freshTimetable] = await Promise.all([
        getStudentBuilderDraft(me.id, { scheduleId: id }),
        getStudentOptionTimetable(me.id, id),
      ]);
      await mutateDraft(freshDraft, { revalidate: false });
      await mutateTimetable(freshTimetable, { revalidate: false });
      toastSuccess("Opción lista", "Puedes ajustar el horario manualmente.");
      router.replace(`/student/schedule/builder?periodId=${periodId}&scheduleId=${id}`);
    } catch {
      toastError("No se pudo importar", "La opción ya no está disponible.");
    } finally {
      setInitializing(false);
    }
  }, [me, periodId, importSourceId, mutateDraft, mutateTimetable, router]);

  useEffect(() => {
    if (importSourceId && me && periodId) {
      void handleImport();
    }
  }, [importSourceId, me, periodId, handleImport]);

  const refreshAll = useCallback(async () => {
    const sid = draft?.scheduleId ?? scheduleId;
    await mutateDraft();
    if (sid && me) {
      const freshTimetable = await getStudentOptionTimetable(me.id, sid);
      await mutateTimetable(freshTimetable, { revalidate: false });
    } else {
      await mutateTimetable();
    }
  }, [mutateDraft, mutateTimetable, draft?.scheduleId, scheduleId, me]);

  const handleAddCourse = useCallback(
    async (courseId: string, assignmentIds: string[]) => {
      const sid = draft?.scheduleId ?? scheduleId;
      if (!me || !sid) return;
      await addStudentBuilderCourse(me.id, sid, courseId, assignmentIds);
      await refreshAll();
      toastSuccess("Curso agregado");
    },
    [me, draft?.scheduleId, scheduleId, refreshAll],
  );

  const handleRemoveCourse = useCallback(
    async (courseId: string) => {
      const sid = draft?.scheduleId ?? scheduleId;
      if (!me || !sid) return;
      setRemovingCourse(true);
      try {
        await removeStudentBuilderCourse(me.id, sid, courseId);
        await refreshAll();
        toastSuccess("Curso quitado del borrador");
        setCourseToRemove(null);
        if (courseToView === courseId) setCourseToView(null);
      } catch {
        toastError("No se pudo quitar el curso");
      } finally {
        setRemovingCourse(false);
      }
    },
    [me, draft?.scheduleId, scheduleId, refreshAll, courseToView],
  );

  const handleRenew = useCallback(async () => {
    const sid = draft?.scheduleId ?? scheduleId;
    if (!me || !sid) return;
    await renewStudentBuilderDraft(me.id, sid);
    await refreshAll();
  }, [me, draft?.scheduleId, scheduleId, refreshAll]);

  const handleConfirm = useCallback(async () => {
    const sid = draft?.scheduleId ?? scheduleId;
    if (!me || !sid) return;
    setConfirming(true);
    try {
      await confirmStudentScheduleOption(me.id, sid);
      toastSuccess("Horario confirmado");
      router.push(`/student/my-schedule?periodId=${periodId}`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        toastError("Cupo no disponible", "Revisa las secciones y vuelve a intentar.");
      } else {
        toastError("No se pudo confirmar");
      }
    } finally {
      setConfirming(false);
      setConfirmOpen(false);
    }
  }, [me, draft?.scheduleId, scheduleId, periodId, router]);

  const creditLimit = draft?.creditLimit ?? me?.creditLimit ?? 22;
  const totalCredits = draft?.totalCredits ?? 0;

  const viewedCourseItem = useMemo(() => {
    const matches = (draft?.items ?? []).filter((i) => i.courseId === courseToView);
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    const mergedComponents = matches.flatMap((i) => i.components);
    const uniqueByAssignment = new Map(
      mergedComponents.map((c) => [c.courseAssignmentId, c]),
    );
    return {
      ...matches[0],
      components: Array.from(uniqueByAssignment.values()),
    };
  }, [draft, courseToView]);

  const removeCourseLabel = useMemo(() => {
    if (!courseToRemove) return "";
    const item = (draft?.items ?? []).find((i) => i.courseId === courseToRemove);
    return item ? `${item.courseCode} — ${item.courseName}` : "este curso";
  }, [courseToRemove, draft]);

  return (
    <PageShell
      title="Armar horario"
      description="Construye tu combinación de cursos con validación en tiempo real."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label className="text-xs font-semibold">Período académico</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Selecciona período</option>
            {activePeriods.map((p) => (
              <option key={p.id} value={p.id}>{formatPeriod(p)}</option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Créditos: </span>
          <span className={cn("font-semibold", totalCredits > creditLimit && "text-ship-red")}>
            {totalCredits} / {creditLimit}
          </span>
        </div>
        {draft && (
          <>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
                secondsRemaining <= 60
                  ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Hold: {formatClock(secondsRemaining)}
            </div>
            <span className="text-xs text-muted-foreground">
              {draft.liveDraftCount}/3 opciones en uso
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleRenew} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Renovar
            </Button>
          </>
        )}
      </div>

      {!periodId ? (
        <Card className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Selecciona un período para comenzar.
        </Card>
      ) : draftLoading || initializing || (Boolean(activeScheduleId) && timetableLoading && timetable.length === 0 && (draft?.items.length ?? 0) > 0) ? (
        <Card className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="space-y-2 p-4">
            <p className="text-sm font-semibold">Cursos disponibles</p>
            <div className="max-h-[480px] space-y-1 overflow-y-auto">
              {availableCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay más cursos por agregar.</p>
              ) : (
                availableCourses.map((course) => {
                  const missingPrereq = course.prerequisites.some((p) => !p.isSatisfied);
                  return (
                    <button
                      key={course.courseId}
                      type="button"
                      disabled={missingPrereq}
                      onClick={() => setAddCourse(course)}
                      className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                      title={missingPrereq ? "Prerrequisitos faltantes" : undefined}
                    >
                      <span>
                        <span className="font-mono font-semibold">{course.courseCode}</span>
                        <span className="ml-2 text-muted-foreground">{course.courseCredits} cr.</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-[#6B21A8]" />
                    </button>
                  );
                })
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full gap-1"
              onClick={() => router.push(`/student/schedule/options?periodId=${periodId}`)}
            >
              <Sparkles className="h-4 w-4" />
              Opciones automáticas
            </Button>
          </Card>

          <Card className="p-4">
            <WeeklyGrid
              slots={timetable}
              mode="edit"
              onCourseClick={setCourseToView}
              emptyMessage="Agrega cursos desde el panel izquierdo."
            />
          </Card>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!activeScheduleId || (draft?.items.length ?? 0) === 0 || confirming}
          onClick={() => setConfirmOpen(true)}
          className="gap-2 bg-[#6B21A8] text-white hover:bg-[#581c87]"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar horario
        </Button>
      </div>

      <AddStudentCourseDialog
        open={addCourse !== null}
        onOpenChange={(o) => { if (!o) setAddCourse(null); }}
        course={addCourse}
        studentId={me?.id ?? ""}
        scheduleId={activeScheduleId ?? ""}
        creditLimit={creditLimit}
        currentTotalCredits={totalCredits}
        currentAssignments={currentAssignments}
        approvedCourseIds={approvedCourseIds}
        onAdded={refreshAll}
        onConfirmAdd={handleAddCourse}
      />

      <StudentBuilderCourseDetailDialog
        open={courseToView !== null}
        onOpenChange={(o) => { if (!o) setCourseToView(null); }}
        item={viewedCourseItem}
        slots={timetable}
        onRequestRemove={
          courseToView
            ? () => setCourseToRemove(courseToView)
            : undefined
        }
      />

      <ConfirmDialog
        open={courseToRemove !== null}
        onOpenChange={(o) => { if (!o) setCourseToRemove(null); }}
        title="¿Quitar este curso?"
        description={`Se eliminará ${removeCourseLabel} del borrador y se liberará el cupo reservado.`}
        confirmLabel="Sí, quitar"
        variant="destructive"
        isLoading={removingCourse}
        onConfirm={() => {
          if (courseToRemove) void handleRemoveCourse(courseToRemove);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Confirmar este horario?"
        description="Se registrará tu selección y se consumirá el cupo de las secciones elegidas."
        confirmLabel="Sí, confirmar"
        isLoading={confirming}
        onConfirm={handleConfirm}
      />
    </PageShell>
  );
}
