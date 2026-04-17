"use client";
// TODO Fase 2/3: Grilla semanal días × franjas horarias — RF-16
// Reutilizada en: horario docente, horario estudiante, vista general
import { useTranslation } from "@/lib/i18n";

export default function WeeklyGrid() {
  const { t } = useTranslation();
  return (
    <div className="card-border rounded-xl overflow-auto">
      <p className="p-4 text-sm text-gray-400">{t.weeklyGrid}</p>
    </div>
  );
}
