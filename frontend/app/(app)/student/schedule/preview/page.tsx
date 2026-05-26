"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import NrcScheduleView from "@/components/schedule/student/NrcScheduleView";
import {
  getCurrentStudent,
  getStudentAvailableCourses,
} from "@/lib/studentScheduleApi";
import type { StudentMe, StudentPendingCourse } from "@/types/studentSchedule";

export default function StudentSchedulePreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodId = searchParams.get("periodId") ?? "";
  const courseId = searchParams.get("courseId") ?? "";
  const sectionId = searchParams.get("sectionId") ?? "";

  const { data: me } = useSWR<StudentMe>("/api/students/me", () => getCurrentStudent());

  const { data: courses = [], isLoading } = useSWR<StudentPendingCourse[]>(
    me && periodId ? `available-courses-${me.id}-${periodId}` : null,
    () => getStudentAvailableCourses(me!.id, periodId),
  );

  const { course, section } = useMemo(() => {
    const c = courses.find((x) => x.courseId === courseId) ?? null;
    const s = c?.sections.find((x) => x.sectionId === sectionId) ?? null;
    return { course: c, section: s };
  }, [courses, courseId, sectionId]);

  const title = course
    ? `${course.courseCode} · ${course.courseName}`
    : "Horario del curso";
  const description = section
    ? `NRC ${section.nrc ?? "—"}${section.sectionNumber != null ? ` · Sección ${section.sectionNumber}` : ""}`
    : "Vista semanal del horario";

  return (
    <PageShell title={title} description={description}>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      </div>

      {isLoading ? (
        <Card className="flex h-[400px] items-center justify-center bg-white border border-gray-100 shadow-none rounded-xl">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : !course || !section ? (
        <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
          <p className="text-sm text-muted-foreground">No se encontró el horario solicitado.</p>
        </Card>
      ) : (
        <Card className="bg-white border border-gray-100 shadow-none rounded-xl p-5">
          <NrcScheduleView course={course} section={section} />
        </Card>
      )}
    </PageShell>
  );
}
