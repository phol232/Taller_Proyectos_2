"use client";
// RF-12: Consulta de oferta horaria del estudiante
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BookOpen, CalendarDays } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { adminApi } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import {
  getCurrentStudent,
  getStudentAvailableCourses,
} from "@/lib/studentScheduleApi";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type {
  PendingCourseSection,
  StudentMe,
  StudentPendingCourse,
} from "@/types/studentSchedule";


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

function formatPeriod(p: AcademicPeriodAdmin) {
  return `${p.code} · ${p.name}`;
}

interface SlotChip {
  componentType: "THEORY" | "PRACTICE" | "GENERAL";
  label: string;
}

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
  FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
};

function renderSlotSummary(section: PendingCourseSection): SlotChip[] {
  const chips: SlotChip[] = [];
  for (const comp of section.components) {
    for (const slot of comp.slots) {
      chips.push({
        componentType: comp.componentType,
        label: `${DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek} ${slot.startTime}–${slot.endTime} · ${slot.classroomCode}`,
      });
    }
  }
  chips.sort((a, b) => {
    const aDay = a.label.slice(0, 3);
    const bDay = b.label.slice(0, 3);
    const aOrder = Object.entries(DAY_LABEL).find(([, v]) => v === aDay)?.[0];
    const bOrder = Object.entries(DAY_LABEL).find(([, v]) => v === bDay)?.[0];
    return (DAY_ORDER[aOrder ?? ""] ?? 99) - (DAY_ORDER[bOrder ?? ""] ?? 99);
  });
  return chips;
}

const CHIP_STYLE: Record<string, string> = {
  THEORY:
    "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
  PRACTICE:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
  GENERAL:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800",
};

const CHIP_DOT: Record<string, string> = {
  THEORY: "bg-violet-500",
  PRACTICE: "bg-emerald-500",
  GENERAL: "bg-sky-500",
};

export default function StudentGeneratePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [periodId, setPeriodId] = useState<string>("");

  const { data: me, error: meError } = useSWR<StudentMe>(
    "/api/students/me",
    () => getCurrentStudent(),
  );

  const { data: periods = [] } = useSWR<AcademicPeriodAdmin[]>(
    "/api/academic-periods",
    () => adminApi.listAcademicPeriods(),
  );

  const activePeriods = useMemo(
    () => periods.filter((p) => p.isActive),
    [periods],
  );

  useEffect(() => {
    if (!periodId && activePeriods.length > 0) {
      setPeriodId(activePeriods[0].id);
    }
  }, [periodId, activePeriods]);

  const courseListKey = me && periodId ? `available-courses-${me.id}-${periodId}` : null;

  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError,
  } = useSWR<StudentPendingCourse[]>(
    courseListKey,
    () => getStudentAvailableCourses(me!.id, periodId),
    { keepPreviousData: true },
  );

  if (meError) {
    return (
      <PageShell title={t.subpages.viewSchedules.title} description={t.subpages.viewSchedules.desc}>
        <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
          <p className="text-sm text-muted-foreground">No se encontró un estudiante vinculado a este usuario.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.subpages.viewSchedules.title} description={t.subpages.viewSchedules.desc}>
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-3 px-5 py-4">
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Período académico</label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
              >
                {activePeriods.length === 0 && <option value="">Sin períodos activos</option>}
                {activePeriods.map((p) => (
                  <option key={p.id} value={p.id}>{formatPeriod(p)}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Estudiante</label>
              <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm">
                {me ? `${me.code} · ciclo ${me.cycle}` : "Cargando..."}
              </div>
            </div>
          </div>
        </section>

        {!periodId ? (
          <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
            <p className="text-sm text-muted-foreground">Selecciona un período académico para ver los cursos disponibles.</p>
          </Card>
        ) : coursesLoading ? (
          <div className="h-[300px] animate-pulse rounded-xl bg-muted/40" />
        ) : coursesError ? (
          <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
            <p className="text-sm text-muted-foreground">No se pudieron cargar los cursos.</p>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
            >
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-vercel-black mb-1">Sin cursos pendientes</p>
            <p className="text-xs text-gray-400">No tienes cursos por cursar en este período.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {courses.map((course) => {
              const hasSections = course.sections.length > 0;
              return (
                <Card key={course.courseId} className="border border-gray-100 bg-white shadow-none rounded-xl">
                  <div className="border-b border-border px-5 py-3">
                    <div className="text-sm font-semibold text-foreground">
                      {course.courseCode} · {course.courseName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ciclo {course.courseCycle} · {course.courseCredits} créditos · {course.requiredComponents} componente(s)
                    </div>
                  </div>

                  {!hasSections ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground">
                      Aún no hay secciones publicadas para este curso en el horario confirmado.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {course.sections.map((section) => {
                        const slots = renderSlotSummary(section);
                        return (
                          <div key={section.sectionId} className="px-5 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                                  <span>NRC {section.nrc ?? "—"}</span>
                                  {section.sectionNumber != null && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      Sec {section.sectionNumber}
                                    </span>
                                  )}
                                </div>
                                <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                                  {section.components.map((comp) => (
                                    <div key={comp.assignmentId}>
                                      <span className="font-medium text-foreground">{COMPONENT_LABEL[comp.componentType] ?? comp.componentType}:</span>{" "}
                                      {comp.teacherName}
                                    </div>
                                  ))}
                                </div>
                                {slots.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {slots.map((s, i) => (
                                      <span
                                        key={i}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                          CHIP_STYLE[s.componentType] ?? CHIP_STYLE.GENERAL,
                                        )}
                                      >
                                        <span className={cn("h-1.5 w-1.5 rounded-full", CHIP_DOT[s.componentType] ?? CHIP_DOT.GENERAL)} />
                                        {s.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => router.push(`/student/schedule/preview?periodId=${periodId}&courseId=${course.courseId}&sectionId=${section.sectionId}`)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#6B21A8]/20 bg-[#6B21A8]/5 px-3 py-1.5 text-xs font-semibold text-[#6B21A8] transition hover:bg-[#6B21A8]/10"
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                Ver horario
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </PageShell>
  );
}
