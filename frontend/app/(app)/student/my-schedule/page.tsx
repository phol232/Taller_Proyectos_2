"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import WeeklyGrid from "@/components/schedule/WeeklyGrid";
import { adminApi } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import {
  getCurrentStudent,
  getStudentActiveSchedule,
  getStudentConfirmedTimetable,
} from "@/lib/studentScheduleApi";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { TimetableSlot } from "@/types/schedule";
import type { StudentMe } from "@/types/studentSchedule";

function formatPeriod(p: AcademicPeriodAdmin) {
  return `${p.code} · ${p.name}`;
}

export default function MySchedulePage() {
  const [periodId, setPeriodId] = useState("");

  const { data: me } = useSWR<StudentMe>("/api/students/me", () => getCurrentStudent());
  const { data: periods = [] } = useSWR("/api/academic-periods", () => adminApi.listAcademicPeriods());
  const activePeriods = useMemo(
    () => (periods as AcademicPeriodAdmin[]).filter((p) => p.isActive),
    [periods],
  );

  const effectivePeriodId = periodId || activePeriods[0]?.id || "";

  const scheduleKey = me && effectivePeriodId
    ? `active-schedule-${me.id}-${effectivePeriodId}`
    : null;
  const { data: activeSchedule, isLoading: scheduleLoading } = useSWR(
    scheduleKey,
    () => getStudentActiveSchedule(me!.id, effectivePeriodId),
  );

  const timetableKey = me && effectivePeriodId && activeSchedule?.status === "CONFIRMED"
    ? `confirmed-timetable-${me.id}-${effectivePeriodId}`
    : null;
  const { data: timetable = [], isLoading: timetableLoading } = useSWR<TimetableSlot[]>(
    timetableKey,
    () => getStudentConfirmedTimetable(me!.id, effectivePeriodId),
  );

  const isConfirmed = activeSchedule?.status === "CONFIRMED";
  const loading = scheduleLoading || (isConfirmed && timetableLoading);

  return (
    <PageShell
      title="Mi horario"
      description="Horario confirmado para el período seleccionado."
    >
      <div className="mb-4 max-w-xs space-y-1">
        <label className="text-xs font-semibold">Período académico</label>
        <select
          value={effectivePeriodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {activePeriods.map((p) => (
            <option key={p.id} value={p.id}>{formatPeriod(p)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Card className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : !isConfirmed ? (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
          >
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Aún no tienes un horario confirmado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Arma tu horario manualmente o genera opciones automáticas.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href={`/student/schedule/builder?periodId=${effectivePeriodId}`}
              className={cn(
                buttonVariants(),
                "bg-[#6B21A8] text-white hover:bg-[#581c87]",
              )}
            >
              Armar horario
            </Link>
            <Link
              href={`/student/schedule/options?periodId=${effectivePeriodId}`}
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
            >
              <Sparkles className="h-4 w-4" />
              Generar opciones
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <WeeklyGrid
            slots={timetable}
            mode="readonly"
            emptyMessage="Tu horario confirmado no tiene bloques."
          />
        </Card>
      )}
    </PageShell>
  );
}
