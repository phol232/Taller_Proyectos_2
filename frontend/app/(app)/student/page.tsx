"use client";

import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function StudentHomePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const firstName = user?.name?.split(" ")[0] ?? t.student.fallbackName;

  const QUICK_ACTIONS = [
    { title: t.student.actions.myScheduleTitle,    description: t.student.actions.myScheduleDesc,    href: "/student/my-schedule",          icon: <CalendarDays className="h-5 w-5" /> },
    { title: t.student.actions.viewSchedulesTitle, description: t.student.actions.viewSchedulesDesc, href: "/student/schedule/generate",    icon: <BookOpen className="h-5 w-5" /> },
    { title: t.student.actions.buildScheduleTitle, description: t.student.actions.buildScheduleDesc, href: "/student/schedule/builder",     icon: <Sparkles className="h-5 w-5" /> },
  ];

  const INFO_CARDS = [
    { label: t.student.info.activeCycle,      value: t.student.info.activeCycleValue,  sub: t.student.info.activeCycleDesc,      icon: <Clock className="h-4 w-4" /> },
    { label: t.student.info.enrolledCourses,  value: "—",                               sub: t.student.info.enrolledCoursesDesc,  icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: t.student.info.credits,          value: "—",                               sub: t.student.info.creditsDesc,          icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <PageShell
      title={t.student.title.replace("{name}", firstName)}
      description={t.student.description}
    >
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {INFO_CARDS.map((card) => (
          <Card key={card.label} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
                {card.label}
              </span>
              <span style={{ color: "#6B21A8" }}>{card.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-[#171717] dark:text-white tracking-tight">
              {card.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </Card>
        ))}
      </div>

      {/* Acciones rápidas */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {t.student.quickActions}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className="group block">
            <Card className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 hover:shadow-sm transition-all h-full">
              <div className="flex flex-col gap-3 h-full">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
                >
                  {action.icon}
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#171717] dark:text-white mb-1 group-hover:text-[#6B21A8] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div
                  className="flex items-center gap-1 text-xs font-medium transition-colors mt-1"
                  style={{ color: "rgba(107,33,168,0.5)" }}
                >
                  {t.common.goNow}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
