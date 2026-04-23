"use client";

import type React from "react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import {
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  CalendarDays,
  CalendarCheck,
  Building2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Settings2,
} from "lucide-react";

export default function AdminHomePage() {
  const { t } = useTranslation();

  const STAT_CARDS = [
    { label: t.admin.stats.students,   value: "—", sub: t.admin.stats.studentsDesc,   icon: <Users className="h-5 w-5" />,          href: "/admin/students" },
    { label: t.admin.stats.teachers,   value: "—", sub: t.admin.stats.teachersDesc,   icon: <GraduationCap className="h-5 w-5" />,  href: "/admin/teachers" },
    { label: t.admin.stats.courses,    value: "—", sub: t.admin.stats.coursesDesc,    icon: <BookOpen className="h-5 w-5" />,        href: "/admin/courses" },
    { label: t.admin.stats.classrooms, value: "—", sub: t.admin.stats.classroomsDesc, icon: <DoorOpen className="h-5 w-5" />,        href: "/admin/classrooms" },
    { label: "Facultades", value: "—", sub: "Facultades y carreras del catálogo.", icon: <Building2 className="h-5 w-5" />, href: "/admin/facultades" },
    { label: "Períodos", value: "—", sub: "Ciclos configurados para la planificación.", icon: <CalendarDays className="h-5 w-5" />, href: "/admin/academic-periods" },
    { label: "Ofertas", value: "—", sub: "Cursos abiertos por período y sección.", icon: <CalendarCheck className="h-5 w-5" />, href: "/admin/course-offerings" },
  ];

  const QUICK_LINKS = [
    { title: t.admin.links.studentsTitle,   description: t.admin.links.studentsDesc,   href: "/admin/students",   icon: <Users className="h-5 w-5" /> },
    { title: t.admin.links.teachersTitle,   description: t.admin.links.teachersDesc,   href: "/admin/teachers",   icon: <GraduationCap className="h-5 w-5" /> },
    { title: t.admin.links.coursesTitle,    description: t.admin.links.coursesDesc,    href: "/admin/courses",    icon: <BookOpen className="h-5 w-5" /> },
    { title: t.admin.links.classroomsTitle, description: t.admin.links.classroomsDesc, href: "/admin/classrooms", icon: <DoorOpen className="h-5 w-5" /> },
    { title: "Facultades y carreras", description: "Gestiona el catálogo de facultades y sus carreras asociadas.", href: "/admin/facultades", icon: <Building2 className="h-5 w-5" /> },
    { title: "Períodos académicos", description: "Define ciclos, rango de fechas y tope general de créditos.", href: "/admin/academic-periods", icon: <CalendarDays className="h-5 w-5" /> },
    { title: "Ofertas de cursos", description: "Abre cursos por período, crea secciones y asigna docentes candidatos.", href: "/admin/course-offerings", icon: <CalendarCheck className="h-5 w-5" /> },
  ];

  const SYSTEM_CARDS: { label: string; value: string; icon: React.ReactNode; accent?: boolean }[] = [
    { label: t.admin.system.activeCycle, value: t.admin.system.activeCycleValue, icon: <TrendingUp className="h-4 w-4" /> },
    { label: t.admin.system.status,      value: t.admin.system.statusValue,      icon: <ShieldCheck className="h-4 w-4" />, accent: true },
    { label: t.admin.system.version,     value: t.admin.system.versionValue,     icon: <Settings2 className="h-4 w-4" /> },
  ];
  return (
    <PageShell
      title={t.admin.title}
      description={t.admin.description}
    >
      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="group block">
            <Card className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(107,33,168,0.08)", color: "#6B21A8" }}
                >
                  {card.icon}
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors group-hover:translate-x-0.5 transform"
                />
              </div>
              <p className="text-2xl font-semibold text-[#171717] dark:text-white tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulos de gestión */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t.admin.modules}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="group block">
                <Card className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 transition-all">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: "rgba(107,33,168,0.06)", color: "#6B21A8" }}
                    >
                      {link.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[#171717] dark:text-white mb-0.5 group-hover:text-[#6B21A8] transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Estado del sistema */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t.admin.systemStatus}
          </h2>
          <Card className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl divide-y divide-gray-50 dark:divide-white/5">
            {SYSTEM_CARDS.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{item.icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={item.accent ? { color: "#16a34a" } : { color: "#171717" }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </Card>

          {/* Aviso Fase */}
          <div
            className="mt-3 rounded-xl p-4 border"
            style={{
              backgroundColor: "rgba(107,33,168,0.04)",
              borderColor:     "rgba(107,33,168,0.15)",
            }}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "#6B21A8" }}
            >
              {t.admin.footer}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.admin.metricsNote}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
