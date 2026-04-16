"use client";
// RF-16: Vista general de horarios del período — Fase 3
import { useTranslation } from "@/lib/i18n";

export default function SchedulesViewPage() {
  const { t } = useTranslation();
  return <div className="p-8"><p className="text-sm text-gray-400">{t.subpages.schedulesView.phase}</p></div>;
}
