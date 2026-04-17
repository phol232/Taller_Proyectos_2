"use client";
// RF-07: Generación automática de horario docente — Fase 2
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function GenerateSchedulePage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t.subpages.generateSchedule.title}
      description={t.subpages.generateSchedule.desc}
    >
      <Card className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 shadow-none rounded-xl">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
        >
          <CalendarCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-vercel-black mb-1">{t.common.moduleUnderConstruction}</p>
        <p className="text-xs text-gray-400">{t.subpages.generateSchedule.phase}</p>
      </Card>
    </PageShell>
  );
}
