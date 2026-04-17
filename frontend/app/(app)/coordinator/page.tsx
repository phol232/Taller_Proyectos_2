"use client";

import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  CalendarCheck,
  Sparkles,
  CalendarDays,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function CoordinatorHomePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const firstName = user?.name?.split(" ")[0] ?? t.coordinator.fallbackName;

  const STAT_CARDS = [
    { label: t.coordinator.stats.generatedSchedules,    value: "—",      sub: t.coordinator.stats.generatedSchedulesDesc,    icon: <CalendarDays className="h-5 w-5" /> },
    { label: t.coordinator.stats.conflictsDetected,     value: "—",      sub: t.coordinator.stats.conflictsDetectedDesc,     icon: <AlertTriangle className="h-5 w-5" /> },
    { label: t.coordinator.stats.teachersAvailability,  value: "—",      sub: t.coordinator.stats.teachersAvailabilityDesc,  icon: <CheckCircle2 className="h-5 w-5" /> },
    { label: t.coordinator.stats.activeCycle,            value: t.coordinator.stats.activeCycleValue, sub: t.coordinator.stats.activeCycleDesc, icon: <TrendingUp className="h-5 w-5" /> },
  ];

  const QUICK_ACTIONS = [
    { title: t.coordinator.actions.generateTitle,     description: t.coordinator.actions.generateDesc,     href: "/coordinator/schedule/generate", icon: <CalendarCheck className="h-5 w-5" /> },
    { title: t.coordinator.actions.builderTitle,      description: t.coordinator.actions.builderDesc,      href: "/coordinator/schedule/builder",  icon: <Sparkles className="h-5 w-5" /> },
    { title: t.coordinator.actions.confirmTitle,      description: t.coordinator.actions.confirmDesc,      href: "/coordinator/schedule/confirm",  icon: <CalendarDays className="h-5 w-5" /> },
    { title: t.coordinator.actions.availabilityTitle, description: t.coordinator.actions.availabilityDesc, href: "/coordinator/teacher-availability", icon: <Clock className="h-5 w-5" /> },
  ];

  return (
    <PageShell
      title={t.coordinator.title.replace("{name}", firstName)}
      description={t.coordinator.description}
    >
      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <Card key={card.label} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(107,33,168,0.08)", color: "#6B21A8" }}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#171717] dark:text-white tracking-tight">
              {card.value}
            </p>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-0.5">
              {card.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </Card>
        ))}
      </div>

      {/* Acciones rápidas */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {t.coordinator.workflow}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_ACTIONS.map((action, i) => (
          <Link key={action.href} href={action.href} className="group block">
            <Card className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 shadow-none rounded-xl hover:border-gray-200 dark:hover:border-white/15 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
                >
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: "rgba(107,33,168,0.08)",
                          color: "#6B21A8",
                        }}
                      >
                        0{i + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-[#171717] dark:text-white group-hover:text-[#6B21A8] transition-colors">
                        {action.title}
                      </h3>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#6B21A8] transition-colors group-hover:translate-x-0.5 transform" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
