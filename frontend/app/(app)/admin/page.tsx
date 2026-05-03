"use client";

import { useEffect, useState } from "react";
import type React from "react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { adminApi } from "@/lib/adminApi";
import type { AcademicPeriodAdmin } from "@/types/admin";
import {
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  CalendarDays,
  Building2,
  UserCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface DashboardStats {
  users: number | null;
  students: number | null;
  teachers: number | null;
  courses: number | null;
  classrooms: number | null;
  facultades: number | null;
  periods: number | null;
}

const PERIOD_STATUS_CONFIG: Record<
  AcademicPeriodAdmin["status"],
  { label: string; badge: string; dot: string }
> = {
  ACTIVE: {
    label: "Activo",
    dot: "bg-green-500",
    badge:
      "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-400/10 dark:border-green-400/20",
  },
  PLANNING: {
    label: "Planificación",
    dot: "bg-amber-500",
    badge:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20",
  },
  CLOSED: {
    label: "Cerrado",
    dot: "bg-gray-400",
    badge:
      "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-400/10 dark:border-gray-400/20",
  },
};

function StatSkeleton() {
  return (
    <div className="h-7 w-14 bg-gray-100 dark:bg-white/10 animate-pulse rounded-md" />
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminHomePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    users: null,
    students: null,
    teachers: null,
    courses: null,
    classrooms: null,
    facultades: null,
    periods: null,
  });
  const [activePeriod, setActivePeriod] = useState<AcademicPeriodAdmin | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.listUsers(1),
      adminApi.listStudents(1),
      adminApi.listTeachers(1),
      adminApi.listCourses(1, 1),
      adminApi.listClassrooms(1),
      adminApi.listAllFacultades(),
      adminApi.listAcademicPeriods(),
    ])
      .then(
        ([users, students, teachers, courses, classrooms, facultades, periods]) => {
          setStats({
            users: users.totalCount,
            students: students.totalCount,
            teachers: teachers.totalCount,
            courses: courses.totalCount,
            classrooms: classrooms.totalCount,
            facultades: facultades.filter((f) => f.isActive).length,
            periods: periods.length,
          });
          const current =
            periods.find((p) => p.status === "ACTIVE") ??
            periods.find((p) => p.status === "PLANNING") ??
            periods[periods.length - 1] ??
            null;
          setActivePeriod(current);
        },
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STAT_CARDS: {
    key: keyof DashboardStats;
    label: string;
    sub: string;
    icon: React.ReactNode;
    href: string;
  }[] = [
    {
      key: "users",
      label: "Usuarios",
      sub: "Cuentas, roles y acceso",
      icon: <UserCircle className="h-5 w-5" />,
      href: "/admin/users",
    },
    {
      key: "students",
      label: t.admin.stats.students,
      sub: "Registrados en el sistema",
      icon: <Users className="h-5 w-5" />,
      href: "/admin/students",
    },
    {
      key: "teachers",
      label: t.admin.stats.teachers,
      sub: "En el directorio",
      icon: <GraduationCap className="h-5 w-5" />,
      href: "/admin/teachers",
    },
    {
      key: "courses",
      label: t.admin.stats.courses,
      sub: "En el catálogo",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/admin/courses",
    },
    {
      key: "classrooms",
      label: t.admin.stats.classrooms,
      sub: "Para asignación",
      icon: <DoorOpen className="h-5 w-5" />,
      href: "/admin/classrooms",
    },
    {
      key: "facultades",
      label: "Facultades",
      sub: "Activas en el catálogo",
      icon: <Building2 className="h-5 w-5" />,
      href: "/admin/facultades",
    },
    {
      key: "periods",
      label: "Períodos",
      sub: "Ciclos configurados",
      icon: <CalendarDays className="h-5 w-5" />,
      href: "/admin/academic-periods",
    },
  ];

  const MODULES = [
    {
      title: "Usuarios",
      description: "Revisa cuentas del sistema, roles, verificación y estado.",
      href: "/admin/users",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: t.admin.links.studentsTitle,
      description: t.admin.links.studentsDesc,
      href: "/admin/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: t.admin.links.teachersTitle,
      description: t.admin.links.teachersDesc,
      href: "/admin/teachers",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      title: t.admin.links.coursesTitle,
      description: t.admin.links.coursesDesc,
      href: "/admin/courses",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: t.admin.links.classroomsTitle,
      description: t.admin.links.classroomsDesc,
      href: "/admin/classrooms",
      icon: <DoorOpen className="h-5 w-5" />,
    },
    {
      title: "Facultades y carreras",
      description:
        "Gestiona el catálogo de facultades y sus carreras asociadas.",
      href: "/admin/facultades",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      title: "Períodos académicos",
      description: "Define ciclos, rango de fechas y tope general de créditos.",
      href: "/admin/academic-periods",
      icon: <CalendarDays className="h-5 w-5" />,
    },
  ];

  const periodCfg = activePeriod
    ? PERIOD_STATUS_CONFIG[activePeriod.status]
    : null;

  return (
    <PageShell title={t.admin.title} description={t.admin.description}>
      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {STAT_CARDS.map((card) => (
          <Link key={card.key} href={card.href} className="group block">
            <Card className="p-4 h-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(107,33,168,0.08)",
                    color: "#6B21A8",
                  }}
                >
                  {card.icon}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors group-hover:translate-x-0.5 transform" />
              </div>
              {loading ? (
                <StatSkeleton />
              ) : (
                <p className="text-2xl font-semibold text-[#171717] dark:text-white tracking-tight">
                  {stats[card.key] !== null
                    ? stats[card.key]!.toLocaleString("es-PE")
                    : "—"}
                </p>
              )}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                {card.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug hidden sm:block">
                {card.sub}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulos de gestión — 2/3 */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t.admin.modules}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((mod) => (
              <Link key={mod.href} href={mod.href} className="group block">
                <Card className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 transition-all">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: "rgba(107,33,168,0.06)",
                        color: "#6B21A8",
                      }}
                    >
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#171717] dark:text-white group-hover:text-[#6B21A8] transition-colors truncate">
                          {mod.title}
                        </h3>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#6B21A8] transition-colors shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4">
          {/* Período académico */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Período académico
            </h2>
            <Card className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-5 w-28 bg-gray-100 dark:bg-white/10 animate-pulse rounded" />
                  <div className="h-3.5 w-20 bg-gray-100 dark:bg-white/10 animate-pulse rounded" />
                  <div className="h-px w-full bg-gray-50 dark:bg-white/5 my-3" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-white/10 animate-pulse rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-white/10 animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 dark:bg-white/10 animate-pulse rounded" />
                </div>
              ) : activePeriod ? (
                <>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#171717] dark:text-white leading-tight">
                        {activePeriod.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {activePeriod.code}
                      </p>
                    </div>
                    {periodCfg && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${periodCfg.badge}`}
                      >
                        {periodCfg.label}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 border-t border-gray-50 dark:border-white/5 pt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Inicio</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {formatDate(activePeriod.startsAt)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Fin</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {formatDate(activePeriod.endsAt)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Tope de créditos</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {activePeriod.maxStudentCredits} cr.
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/admin/academic-periods"
                    className="mt-3 flex items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: "#6B21A8" }}
                  >
                    Ver todos los períodos{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sin período configurado
                  </p>
                  <Link
                    href="/admin/academic-periods"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: "#6B21A8" }}
                  >
                    Crear período <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Estado del sistema */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t.admin.systemStatus}
            </h2>
            <Card className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl divide-y divide-gray-50 dark:divide-white/5">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t.admin.system.status}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#16a34a" }}
                >
                  {t.admin.system.statusValue}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t.admin.system.version}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#171717] dark:text-white">
                  {t.admin.system.versionValue}
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
