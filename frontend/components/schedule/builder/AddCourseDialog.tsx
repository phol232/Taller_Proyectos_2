"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Search } from "lucide-react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { addCourseAssignment, getScheduleAssignments, getTimeSlots, validateSlot } from "@/lib/scheduleBuilderApi";
import type { AvailabilitySlot, CourseAdmin, ClassroomAdmin, TeacherAdmin } from "@/types/admin";
import type { ScheduleAssignment, SlotConflict, SlotInputPayload, TimeSlot } from "@/types/scheduleBuilder";

const INSTITUTIONAL_BLOCK_HOURS = 1.5;

const DAY_LABEL: Record<string, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mié",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

const COMPONENT_LABEL: Record<string, string> = {
  THEORY: "Teoría",
  PRACTICE: "Práctica",
  GENERAL: "General",
};

// Franjas pedagógicas institucionales (90 min). Cualquier slot que no encaje
// exactamente con uno de estos pares se considera "compuesto" (ventana de
// disponibilidad) y se descarta del picker.
const INSTITUTIONAL_BLOCKS: { start: string; end: string }[] = [
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
const INSTITUTIONAL_KEYS = new Set(
  INSTITUTIONAL_BLOCKS.map((b) => `${b.start}|${b.end}`),
);

export type AddCourseMode = "FULL" | "GENERAL" | "FULL_BOTH";

interface PrefilledCell {
  timeSlotId: string;
  classroomId?: string | null;
  classroomCode?: string | null;
  classroomName?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  mode: AddCourseMode;
  onAdded: () => void;
  prefilledCell?: PrefilledCell | null;
  componentHint?: "THEORY" | "PRACTICE" | null;
}

type SingleStep = "course" | "component" | "teacher" | "classroom" | "slots";
type BothStep =
  | "course"
  | "theoryTeacher" | "theoryClassroom" | "theorySlots"
  | "practiceTeacher" | "practiceClassroom" | "practiceSlots";

interface ComponentPick {
  componentId: string;
  componentType: "THEORY" | "PRACTICE" | "GENERAL";
  weeklyHours: number;
  teacher: TeacherAdmin | null;
  classroom: ClassroomAdmin | null;
  slotIds: Set<string>;
}

function emptyPick(componentType: "THEORY" | "PRACTICE" | "GENERAL"): ComponentPick {
  return {
    componentId: "",
    componentType,
    weeklyHours: 0,
    teacher: null,
    classroom: null,
    slotIds: new Set(),
  };
}

function requiredSlotsFor(pick: ComponentPick): number {
  if (!pick.weeklyHours || pick.weeklyHours <= 0) return 1;
  return Math.max(1, Math.round(pick.weeklyHours / INSTITUTIONAL_BLOCK_HOURS));
}

export default function AddCourseDialog({
  open,
  onOpenChange,
  scheduleId,
  mode,
  onAdded,
  prefilledCell,
  componentHint,
}: Props) {
  const [singleStep, setSingleStep] = useState<SingleStep>("course");
  const [bothStep, setBothStep] = useState<BothStep>("course");
  const [course, setCourse] = useState<CourseAdmin | null>(null);
  const [singlePick, setSinglePick] = useState<ComponentPick>(emptyPick("THEORY"));
  const [theoryPick, setTheoryPick] = useState<ComponentPick>(emptyPick("THEORY"));
  const [practicePick, setPracticePick] = useState<ComponentPick>(emptyPick("PRACTICE"));
  const [courseQuery, setCourseQuery] = useState("");
  const [teacherQuery, setTeacherQuery] = useState("");
  const [classroomQuery, setClassroomQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBoth = mode === "FULL_BOTH";

  const { data: coursesPage } = useSWR(
    open ? `builder-courses-${courseQuery}` : null,
    () => courseQuery.trim()
      ? adminApi.searchCourses(courseQuery.trim(), 1, 30)
      : adminApi.listCourses(1, 30),
  );
  const { data: teachersPage } = useSWR(
    open && teacherQuery.trim() ? `builder-teachers-${teacherQuery}` : null,
    () => adminApi.searchTeachers(teacherQuery.trim(), 1),
  );
  const { data: classroomsPage } = useSWR(
    open ? `builder-classrooms-${classroomQuery}` : null,
    () => classroomQuery.trim()
      ? adminApi.searchClassrooms(classroomQuery.trim(), 1)
      : adminApi.listClassrooms(1, 30),
  );
  const { data: rawTimeSlots = [] } = useSWR<TimeSlot[]>(
    open ? "builder-time-slots" : null,
    () => getTimeSlots(),
  );

  // Asignaciones ya existentes del horario, para mostrar slots ocupados en el picker.
  const { data: existingAssignments = [] } = useSWR<ScheduleAssignment[]>(
    open && scheduleId ? `builder-existing-${scheduleId}` : null,
    () => getScheduleAssignments(scheduleId),
    { revalidateOnFocus: false },
  );

  // Solo franjas pedagógicas institucionales (descarta ventanas de disponibilidad
  // tipo 07:00-22:10, 07:00-13:30, etc. que vienen mezcladas en time_slot).
  const timeSlots = useMemo(
    () =>
      rawTimeSlots.filter((ts) =>
        INSTITUTIONAL_KEYS.has(`${ts.startTime.slice(0, 5)}|${ts.endTime.slice(0, 5)}`),
      ),
    [rawTimeSlots],
  );

  useEffect(() => {
    if (!open) {
      setSingleStep("course");
      setBothStep("course");
      setCourse(null);
      setSinglePick(emptyPick(mode === "GENERAL" ? "GENERAL" : "THEORY"));
      setTheoryPick(emptyPick("THEORY"));
      setPracticePick(emptyPick("PRACTICE"));
      setCourseQuery("");
      setTeacherQuery("");
      setClassroomQuery("");
      setSubmitting(false);
    }
  }, [open, mode]);

  const prefilledSlot = useMemo(
    () => (prefilledCell ? timeSlots.find((t) => t.id === prefilledCell.timeSlotId) ?? null : null),
    [timeSlots, prefilledCell],
  );

  const prefilledClassroom = useMemo<ClassroomAdmin | null>(() => {
    if (!prefilledCell?.classroomId) return null;
    return {
      id: prefilledCell.classroomId,
      code: prefilledCell.classroomCode ?? "",
      name: prefilledCell.classroomName ?? "",
      capacity: 0,
      type: "",
      isActive: true,
      availability: [],
      courseCodes: [],
      courseComponentIds: [],
      createdAt: null,
      updatedAt: null,
    };
  }, [prefilledCell]);

  const initialPickedSlots = useMemo(
    () => (prefilledCell?.timeSlotId ? new Set([prefilledCell.timeSlotId]) : new Set<string>()),
    [prefilledCell],
  );

  const filteredCourses = useMemo(() => {
    const courses = coursesPage?.content ?? [];
    if (mode === "GENERAL") {
      return courses.filter((c) =>
        (c.components ?? []).some((cmp) => cmp.componentType === "GENERAL"),
      );
    }
    if (mode === "FULL_BOTH") {
      return courses.filter((c) => {
        const types = new Set((c.components ?? []).map((cmp) => cmp.componentType));
        return types.has("THEORY") && types.has("PRACTICE");
      });
    }
    return courses.filter((c) =>
      (c.components ?? []).some((cmp) => cmp.componentType !== "GENERAL"),
    );
  }, [coursesPage, mode]);

  const singleComponents = useMemo(() => {
    if (!course) return [];
    const all = course.components ?? [];
    return mode === "GENERAL"
      ? all.filter((c) => c.componentType === "GENERAL")
      : all.filter((c) => c.componentType !== "GENERAL");
  }, [course, mode]);

  function pickCourse(c: CourseAdmin) {
    setCourse(c);
    if (isBoth) {
      const t = (c.components ?? []).find((cmp) => cmp.componentType === "THEORY");
      const p = (c.components ?? []).find((cmp) => cmp.componentType === "PRACTICE");
      if (t?.id) setTheoryPick({ ...emptyPick("THEORY"), componentId: t.id, weeklyHours: t.weeklyHours });
      if (p?.id) setPracticePick({ ...emptyPick("PRACTICE"), componentId: p.id, weeklyHours: p.weeklyHours });
      setBothStep("theoryTeacher");
      return;
    }
    if (mode === "GENERAL") {
      const generalCmp = (c.components ?? []).find((cmp) => cmp.componentType === "GENERAL");
      if (generalCmp?.id) {
        setSinglePick({ ...emptyPick("GENERAL"), componentId: generalCmp.id, weeklyHours: generalCmp.weeklyHours });
        setSingleStep("teacher");
        return;
      }
    }
    // Si hay componentHint, saltar el step "component"
    if (componentHint) {
      const hinted = (c.components ?? []).find((cmp) => cmp.componentType === componentHint);
      if (hinted?.id) {
        setSinglePick({ ...emptyPick(componentHint), componentId: hinted.id, weeklyHours: hinted.weeklyHours });
        setSingleStep("teacher");
        return;
      }
    }
    setSingleStep("component");
  }

  async function submit() {
    if (!course) return;
    setSubmitting(true);
    try {
      if (isBoth) {
        assertPickReady(theoryPick, "Teoría");
        assertPickReady(practicePick, "Práctica");
        await validatePickConflicts(theoryPick, "Teoría");
        await validatePickConflicts(practicePick, "Práctica");
        await sendAssignment(theoryPick);
        await sendAssignment(practicePick);
        toastSuccess(
          "Curso agregado",
          `${course.code} — Teoría (${theoryPick.slotIds.size}) y Práctica (${practicePick.slotIds.size}) creadas.`,
        );
      } else {
        assertPickReady(singlePick, COMPONENT_LABEL[singlePick.componentType]);
        await validatePickConflicts(singlePick, COMPONENT_LABEL[singlePick.componentType]);
        await sendAssignment(singlePick);
        toastSuccess(
          "Curso agregado",
          `${course.code} — ${COMPONENT_LABEL[singlePick.componentType]} con ${singlePick.slotIds.size} franja(s).`,
        );
      }
      onAdded();
      onOpenChange(false);
    } catch (error) {
      toastError("No se pudo agregar el curso", getApiErrorMessage(error, "Verifica conflictos de aula u horario."));
    } finally {
      setSubmitting(false);
    }
  }

  function assertPickReady(pick: ComponentPick, label: string) {
    if (!pick.componentId) throw new Error(`Falta el componente para ${label}.`);
    if (!pick.teacher) throw new Error(`Falta el docente para ${label}.`);
    if (!pick.classroom) throw new Error(`Falta el aula para ${label}.`);
    const required = requiredSlotsFor(pick);
    if (pick.slotIds.size !== required) {
      throw new Error(
        `${label}: debes seleccionar exactamente ${required} franja(s) (${pick.weeklyHours} h/sem). Marcaste ${pick.slotIds.size}.`,
      );
    }
  }

  async function validatePickConflicts(pick: ComponentPick, label: string) {
    if (!pick.teacher || !pick.classroom) return;
    for (const sid of pick.slotIds) {
      const ts = timeSlots.find((t) => t.id === sid);
      if (!ts) continue;
      const conflicts = await validateSlot(scheduleId, {
        assignmentId: null,
        teacherId: pick.teacher.id,
        classroomId: pick.classroom.id,
        timeSlotId: ts.id,
        startTime: ts.startTime,
        endTime: ts.endTime,
        excludeSlotId: null,
      });
      const blocking = conflicts.filter((c: SlotConflict) =>
        c.conflictType === "CLASSROOM_BUSY"
        || c.conflictType === "TEACHER_BUSY"
        || c.conflictType === "DUPLICATE",
      );
      if (blocking.length > 0) {
        const detail = blocking.map((c: SlotConflict) => c.message).join(" · ");
        throw new Error(
          `${label} · ${ts.dayOfWeek} ${ts.startTime.slice(0, 5)}-${ts.endTime.slice(0, 5)}: ${detail}`,
        );
      }
    }
  }

  async function sendAssignment(pick: ComponentPick) {
    const slots: SlotInputPayload[] = Array.from(pick.slotIds).map((sid) => {
      const ts = timeSlots.find((t) => t.id === sid)!;
      return {
        classroomId: pick.classroom!.id,
        timeSlotId: ts.id,
        startTime: ts.startTime,
        endTime: ts.endTime,
      };
    });
    await addCourseAssignment(scheduleId, {
      courseComponentId: pick.componentId,
      teacherId: pick.teacher!.id,
      slots,
    });
  }

  const title = mode === "FULL_BOTH"
    ? "Agregar curso (Teoría + Práctica)"
    : mode === "GENERAL"
      ? "Agregar curso general"
      : "Agregar curso (un componente)";

  // -------------------------------------------------------------- header back btn
  function goBack() {
    if (isBoth) {
      if (bothStep === "theoryTeacher") setBothStep("course");
      else if (bothStep === "theoryClassroom") setBothStep("theoryTeacher");
      else if (bothStep === "theorySlots") setBothStep("theoryClassroom");
      else if (bothStep === "practiceTeacher") setBothStep("theorySlots");
      else if (bothStep === "practiceClassroom") setBothStep("practiceTeacher");
      else if (bothStep === "practiceSlots") setBothStep("practiceClassroom");
    } else {
      if (singleStep === "component") setSingleStep("course");
      else if (singleStep === "teacher") setSingleStep(mode === "GENERAL" ? "course" : "component");
      else if (singleStep === "classroom") setSingleStep("teacher");
      else if (singleStep === "slots") setSingleStep("classroom");
    }
  }

  const showBack = (isBoth && bothStep !== "course") || (!isBoth && singleStep !== "course");
  const isSlotsStep =
    (!isBoth && singleStep === "slots")
    || (isBoth && (bothStep === "theorySlots" || bothStep === "practiceSlots"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "transition-[max-width] duration-200",
          isSlotsStep
            ? "sm:max-w-[min(95vw,940px)]"
            : "sm:max-w-2xl",
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Atrás"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            {course
              ? `${course.code} · ${course.name}`
              : "Selecciona el curso a agregar."}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Course */}
        {((isBoth && bothStep === "course") || (!isBoth && singleStep === "course")) && (
          <CoursePicker
            courses={filteredCourses}
            query={courseQuery}
            onQueryChange={setCourseQuery}
            onPick={pickCourse}
          />
        )}

        {/* Single-component flow */}
        {!isBoth && singleStep === "component" && (
          <div className="space-y-2">
            {singleComponents.length === 0
              ? <p className="text-sm text-muted-foreground">Este curso no tiene componentes disponibles.</p>
              : singleComponents.map((cmp) => (
                <button
                  key={cmp.id ?? cmp.componentType}
                  type="button"
                  onClick={() => {
                    if (cmp.id) {
                      setSinglePick({ ...emptyPick(cmp.componentType), componentId: cmp.id, weeklyHours: cmp.weeklyHours });
                      setSingleStep("teacher");
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm transition hover:bg-muted/60"
                >
                  <div>
                    <p className="font-semibold text-foreground">{COMPONENT_LABEL[cmp.componentType]}</p>
                    <p className="text-[11px] text-muted-foreground">{cmp.weeklyHours} h/sem · aula {cmp.requiredRoomType}</p>
                  </div>
                </button>
              ))}
          </div>
        )}

        {!isBoth && singleStep === "teacher" && (
          <TeacherPicker
            label={`Docente para ${COMPONENT_LABEL[singlePick.componentType]}`}
            teachers={teachersPage?.content ?? []}
            requiredComponentId={singlePick.componentId}
            query={teacherQuery}
            onQueryChange={setTeacherQuery}
            onPick={(t) => {
              if (prefilledClassroom) {
                setSinglePick((p) => ({
                  ...p,
                  teacher: t,
                  classroom: prefilledClassroom,
                  slotIds: new Set(initialPickedSlots),
                }));
                setSingleStep("slots");
              } else {
                setSinglePick((p) => ({ ...p, teacher: t }));
                setSingleStep("classroom");
              }
            }}
          />
        )}
        {!isBoth && singleStep === "classroom" && (
          <ClassroomPicker
            classrooms={classroomsPage?.content ?? []}
            query={classroomQuery}
            onQueryChange={setClassroomQuery}
            onPick={(c) => {
              setSinglePick((p) => ({
                ...p,
                classroom: c,
                slotIds: prefilledCell?.timeSlotId ? new Set([prefilledCell.timeSlotId]) : p.slotIds,
              }));
              setSingleStep("slots");
            }}
          />
        )}
        {!isBoth && singleStep === "slots" && (
          <SlotsPicker
            timeSlots={timeSlots}
            picked={singlePick.slotIds}
            onTogglePicked={(ids) => setSinglePick((p) => ({ ...p, slotIds: ids }))}
            label={`${course?.code} · ${COMPONENT_LABEL[singlePick.componentType]} · ${singlePick.classroom?.code ?? ""}`}
            prefilledHint={prefilledSlot}
            teacherAvailability={singlePick.teacher?.availability ?? []}
            teacherName={singlePick.teacher?.fullName ?? ""}
            requiredSlots={requiredSlotsFor(singlePick)}
            weeklyHours={singlePick.weeklyHours}
            existingAssignments={existingAssignments}
            chosenClassroomId={singlePick.classroom?.id ?? null}
            chosenTeacherId={singlePick.teacher?.id ?? null}
          />
        )}

        {/* Both-component flow */}
        {isBoth && bothStep === "theoryTeacher" && (
          <TeacherPicker
            label="Docente de Teoría"
            teachers={teachersPage?.content ?? []}
            requiredComponentId={theoryPick.componentId}
            query={teacherQuery}
            onQueryChange={setTeacherQuery}
            onPick={(t) => {
              if (prefilledClassroom) {
                setTheoryPick((p) => ({
                  ...p,
                  teacher: t,
                  classroom: prefilledClassroom,
                  slotIds: new Set(initialPickedSlots),
                }));
                setBothStep("theorySlots");
              } else {
                setTheoryPick((p) => ({ ...p, teacher: t }));
                setBothStep("theoryClassroom");
              }
            }}
          />
        )}
        {isBoth && bothStep === "theoryClassroom" && (
          <ClassroomPicker
            classrooms={classroomsPage?.content ?? []}
            query={classroomQuery}
            onQueryChange={setClassroomQuery}
            onPick={(c) => {
              setTheoryPick((p) => ({
                ...p,
                classroom: c,
                slotIds: prefilledCell?.timeSlotId ? new Set([prefilledCell.timeSlotId]) : p.slotIds,
              }));
              setBothStep("theorySlots");
            }}
          />
        )}
        {isBoth && bothStep === "theorySlots" && (
          <SlotsPicker
            timeSlots={timeSlots}
            picked={theoryPick.slotIds}
            onTogglePicked={(ids) => setTheoryPick((p) => ({ ...p, slotIds: ids }))}
            label={`${course?.code} · Teoría · ${theoryPick.classroom?.code ?? ""}`}
            prefilledHint={prefilledSlot}
            teacherAvailability={theoryPick.teacher?.availability ?? []}
            teacherName={theoryPick.teacher?.fullName ?? ""}
            requiredSlots={requiredSlotsFor(theoryPick)}
            weeklyHours={theoryPick.weeklyHours}
            existingAssignments={existingAssignments}
            chosenClassroomId={theoryPick.classroom?.id ?? null}
            chosenTeacherId={theoryPick.teacher?.id ?? null}
          />
        )}
        {isBoth && bothStep === "practiceTeacher" && (
          <TeacherPicker
            label="Docente de Práctica"
            teachers={teachersPage?.content ?? []}
            requiredComponentId={practicePick.componentId}
            query={teacherQuery}
            onQueryChange={setTeacherQuery}
            onPick={(t) => { setPracticePick((p) => ({ ...p, teacher: t })); setBothStep("practiceClassroom"); }}
          />
        )}
        {isBoth && bothStep === "practiceClassroom" && (
          <ClassroomPicker
            classrooms={classroomsPage?.content ?? []}
            query={classroomQuery}
            onQueryChange={setClassroomQuery}
            onPick={(c) => {
              setPracticePick((p) => ({ ...p, classroom: c }));
              setBothStep("practiceSlots");
            }}
          />
        )}
        {isBoth && bothStep === "practiceSlots" && (
          <SlotsPicker
            timeSlots={timeSlots}
            picked={practicePick.slotIds}
            onTogglePicked={(ids) => setPracticePick((p) => ({ ...p, slotIds: ids }))}
            label={`${course?.code} · Práctica · ${practicePick.classroom?.code ?? ""}`}
            teacherAvailability={practicePick.teacher?.availability ?? []}
            teacherName={practicePick.teacher?.fullName ?? ""}
            requiredSlots={requiredSlotsFor(practicePick)}
            weeklyHours={practicePick.weeklyHours}
            existingAssignments={existingAssignments}
            chosenClassroomId={practicePick.classroom?.id ?? null}
            chosenTeacherId={practicePick.teacher?.id ?? null}
          />
        )}

        <DialogFooter>
          {/* Single-flow primary actions */}
          {!isBoth && singleStep === "slots" && (
            <Button
              type="button"
              onClick={submit}
              disabled={singlePick.slotIds.size !== requiredSlotsFor(singlePick) || submitting}
              className="bg-[#6B21A8] text-white hover:bg-[#581C87] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar y agregar
            </Button>
          )}

          {/* Both-flow: theorySlots → continue to practice */}
          {isBoth && bothStep === "theorySlots" && (
            <Button
              type="button"
              onClick={() => setBothStep("practiceTeacher")}
              disabled={theoryPick.slotIds.size !== requiredSlotsFor(theoryPick)}
              className="bg-[#6B21A8] text-white hover:bg-[#581C87] disabled:opacity-50"
            >
              Continuar a Práctica
            </Button>
          )}
          {/* Both-flow: practiceSlots → submit both */}
          {isBoth && bothStep === "practiceSlots" && (
            <Button
              type="button"
              onClick={submit}
              disabled={practicePick.slotIds.size !== requiredSlotsFor(practicePick) || submitting}
              className="bg-[#6B21A8] text-white hover:bg-[#581C87] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Teoría + Práctica
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------- pickers

function CoursePicker({
  courses, query, onQueryChange, onPick,
}: {
  courses: CourseAdmin[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (c: CourseAdmin) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por código o nombre…"
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>
      <div className="max-h-[340px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {courses.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
        ) : courses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/60"
          >
            <div>
              <p className="font-semibold text-foreground">{c.code} · {c.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Ciclo {c.cycle} · {c.credits} créditos · {c.weeklyHours} h/sem
              </p>
            </div>
            <div className="flex gap-1">
              {(c.components ?? []).map((cmp) => (
                <span key={cmp.id ?? cmp.componentType} className="rounded-full bg-muted px-2 py-px text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                  {COMPONENT_LABEL[cmp.componentType]} · {cmp.weeklyHours}h
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeacherPicker({
  label, teachers, requiredComponentId, query, onQueryChange, onPick,
}: {
  label: string;
  teachers: TeacherAdmin[];
  requiredComponentId: string;
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (t: TeacherAdmin) => void;
}) {
  const hasQuery = query.trim().length > 0;
  const eligible = useMemo(
    () =>
      requiredComponentId
        ? teachers.filter((t) => (t.courseComponentIds ?? []).includes(requiredComponentId))
        : teachers,
    [teachers, requiredComponentId],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar docente por nombre o código…"
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>
      <div className="max-h-[320px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {!hasQuery ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Escribe el nombre o código del docente para buscar.
          </p>
        ) : eligible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No se encontraron docentes con este componente asignado. Verifica la asignación en la sección de Docentes.
          </p>
        ) : (
          eligible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/60"
            >
              <div>
                <p className="font-semibold text-foreground">{t.fullName}</p>
                <p className="text-[11px] text-muted-foreground">{t.code} · {t.specialty}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ClassroomPicker({
  classrooms, query, onQueryChange, onPick,
}: {
  classrooms: ClassroomAdmin[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (c: ClassroomAdmin) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar aula…"
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>
      <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto p-0.5">
        {classrooms.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="rounded-lg border border-border p-3 text-left text-xs transition hover:bg-muted/60"
          >
            <p className="font-semibold text-foreground">{c.code}</p>
            <p className="truncate text-[10px] text-muted-foreground">{c.name}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{c.type} · cap {c.capacity}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function isSlotAvailable(slot: TimeSlot, availability: AvailabilitySlot[]): boolean {
  if (!availability || availability.length === 0) return true;
  const s = slot.startTime.slice(0, 5);
  const e = slot.endTime.slice(0, 5);
  return availability.some(
    (a) =>
      a.day === slot.dayOfWeek &&
      a.available === true &&
      a.startTime.slice(0, 5) <= s &&
      a.endTime.slice(0, 5) >= e,
  );
}

function SlotsPicker({
  timeSlots, picked, onTogglePicked, label, prefilledHint, teacherAvailability, teacherName,
  requiredSlots, weeklyHours, existingAssignments, chosenClassroomId, chosenTeacherId,
}: {
  timeSlots: TimeSlot[];
  picked: Set<string>;
  onTogglePicked: (ids: Set<string>) => void;
  label: string;
  prefilledHint?: TimeSlot | null;
  teacherAvailability: AvailabilitySlot[];
  teacherName: string;
  requiredSlots: number;
  weeklyHours: number;
  existingAssignments: ScheduleAssignment[];
  chosenClassroomId: string | null;
  chosenTeacherId: string | null;
}) {
  // Mapas de ocupación: (day|start|end) -> info de conflicto
  type Busy = { kind: "CLASSROOM" | "TEACHER" | "BOTH"; courseCode: string };
  const busyByKey = useMemo(() => {
    const map = new Map<string, Busy>();
    for (const a of existingAssignments) {
      for (const s of a.slots) {
        const key = `${s.dayOfWeek}|${s.startTime.slice(0, 5)}|${s.endTime.slice(0, 5)}`;
        const classroomMatch = chosenClassroomId != null && s.classroomId === chosenClassroomId;
        const teacherMatch = chosenTeacherId != null && a.teacherId === chosenTeacherId;
        if (!classroomMatch && !teacherMatch) continue;
        const prev = map.get(key);
        const kind: Busy["kind"] = classroomMatch && teacherMatch ? "BOTH" : classroomMatch ? "CLASSROOM" : "TEACHER";
        if (!prev) map.set(key, { kind, courseCode: a.courseCode });
        else if (prev.kind !== "BOTH" && kind !== prev.kind) map.set(key, { kind: "BOTH", courseCode: prev.courseCode });
      }
    }
    return map;
  }, [existingAssignments, chosenClassroomId, chosenTeacherId]);
  const hasAvailabilityData = teacherAvailability && teacherAvailability.length > 0;

  // Sanitizar: limpiar selecciones que ya no son válidas por disponibilidad del docente
  useEffect(() => {
    if (!hasAvailabilityData) return;
    const validIds = new Set(
      timeSlots.filter((s) => isSlotAvailable(s, teacherAvailability)).map((s) => s.id),
    );
    let changed = false;
    const next = new Set<string>();
    picked.forEach((id) => {
      if (validIds.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) onTogglePicked(next);
  }, [teacherAvailability, hasAvailabilityData, timeSlots, picked, onTogglePicked]);

  const reachedLimit = picked.size >= requiredSlots;
  const progressOk = picked.size === requiredSlots;

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {label} ·{" "}
        <span className={cn("font-semibold", progressOk ? "text-emerald-600" : "text-foreground")}>
          {picked.size}/{requiredSlots}
        </span>{" "}
        franja(s){weeklyHours ? ` · requiere ${weeklyHours} h/sem` : ""}
        {prefilledHint && picked.has(prefilledHint.id) && (
          <span className="ml-2 rounded-full bg-[#f3e8ff] dark:bg-[#6B21A8]/20 px-2 py-px text-[10px] font-semibold text-[#6B21A8]">
            Franja prefijada incluida
          </span>
        )}
        {hasAvailabilityData && teacherName && (
          <span className="ml-2 rounded-full bg-amber-50 px-2 py-px text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            Disponibilidad de {teacherName}
          </span>
        )}
        {reachedLimit && !progressOk && (
          <span className="ml-2 rounded-full bg-rose-50 px-2 py-px text-[10px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            Excediste el límite
          </span>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-[#6B21A8]" /> Seleccionada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-rose-200 dark:bg-rose-900/60" /> Ocupada (AULA/DOC)
          </span>
          {hasAvailabilityData && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-[repeating-linear-gradient(45deg,transparent_0_2px,rgba(0,0,0,0.15)_2px_4px)]" />
              Fuera de disponibilidad
            </span>
          )}
        </div>
      </div>
      <div className="max-h-[min(70vh,640px)] overflow-y-auto rounded-lg border border-border">
        <div className="grid grid-cols-7 gap-px bg-border">
          {Object.keys(DAY_LABEL).map((day) => (
            <div key={day} className="bg-muted px-3 py-2.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">
              {DAY_LABEL[day]}
            </div>
          ))}
          {Object.keys(DAY_LABEL).map((day) => {
            const slots = timeSlots
              .filter((t) => t.dayOfWeek === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={`col-${day}`} className="bg-background">
                {slots.length === 0 ? (
                  <div className="p-2 text-center text-[10px] text-muted-foreground">—</div>
                ) : slots.map((s) => {
                  const isPicked = picked.has(s.id);
                  const available = isSlotAvailable(s, teacherAvailability);
                  const busyKey = `${s.dayOfWeek}|${s.startTime.slice(0, 5)}|${s.endTime.slice(0, 5)}`;
                  const busy = busyByKey.get(busyKey);
                  const lockedByLimit = !isPicked && reachedLimit;
                  const disabled = !available || lockedByLimit || !!busy;
                  let tooltip: string | undefined;
                  if (!available) tooltip = "El docente no está disponible en esta franja";
                  else if (busy) {
                    const who = busy.kind === "CLASSROOM" ? "El aula ya está ocupada"
                      : busy.kind === "TEACHER" ? "El docente ya está dictando otra clase"
                      : "Aula y docente ya están ocupados";
                    tooltip = `${who} por ${busy.courseCode}`;
                  } else if (lockedByLimit) tooltip = `Ya seleccionaste las ${requiredSlots} franjas requeridas`;
                  const busyTag = busy
                    ? busy.kind === "TEACHER" ? "DOC" : busy.kind === "CLASSROOM" ? "AULA" : "DOC+AULA"
                    : null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      title={tooltip}
                      onClick={() => {
                        if (disabled) return;
                        const next = new Set(picked);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        onTogglePicked(next);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-1.5 px-3 py-3.5 text-left text-[11px] font-medium transition",
                        isPicked && available && !busy && "bg-[#6B21A8] text-white",
                        !isPicked && available && !lockedByLimit && !busy && "hover:bg-muted",
                        !available && "cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgba(0,0,0,0.05)_3px_6px)] text-muted-foreground/40 line-through",
                        busy && available && "cursor-not-allowed bg-rose-50 text-rose-700/70 line-through dark:bg-rose-950/30 dark:text-rose-300/70",
                        lockedByLimit && available && !busy && "cursor-not-allowed text-muted-foreground/40",
                      )}
                    >
                      <span>{s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</span>
                      {busyTag && (
                        <span className="rounded bg-rose-200/80 px-1 text-[8px] font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                          {busyTag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
