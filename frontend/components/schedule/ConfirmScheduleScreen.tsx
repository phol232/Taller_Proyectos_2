"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { confirmScheduleOption, getScheduleOptions } from "@/lib/scheduleApi";
import { useTranslation } from "@/lib/i18n";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { ScheduleOption } from "@/types/schedule";

type Role = "admin" | "coordinator";

interface ConfirmScheduleScreenProps {
  role: Role;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPeriodLabel(period: AcademicPeriodAdmin) {
  return `${period.code} · ${period.name}`;
}

export default function ConfirmScheduleScreen({ role }: ConfirmScheduleScreenProps) {
  const { t } = useTranslation();
  const [academicPeriodId, setAcademicPeriodId] = useState("");
  const [pendingOption, setPendingOption] = useState<ScheduleOption | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const viewBase = role === "admin" ? "/admin/schedule/view" : "/coordinator/schedule/view";

  const { data: academicPeriods = [], isLoading: periodsLoading } = useSWR<AcademicPeriodAdmin[]>(
    "/api/academic-periods",
    () => adminApi.listAcademicPeriods(),
  );

  const optionsKey = academicPeriodId
    ? `/api/schedules/options?academicPeriodId=${academicPeriodId}&confirm=1`
    : null;

  const {
    data: options = [],
    isLoading: optionsLoading,
    mutate: refreshOptions,
  } = useSWR<ScheduleOption[]>(optionsKey, () => getScheduleOptions(academicPeriodId), {
    keepPreviousData: true,
  });

  const activePeriods = useMemo(
    () => academicPeriods.filter((p) => p.isActive),
    [academicPeriods],
  );

  const selectedPeriod = useMemo(
    () => activePeriods.find((p) => p.id === academicPeriodId) ?? null,
    [activePeriods, academicPeriodId],
  );

  useAdminEvents("schedules.changed", () => {
    void refreshOptions();
  });

  useEffect(() => {
    if (!academicPeriodId && activePeriods.length > 0) {
      const planning = activePeriods.find((p) => p.status === "PLANNING");
      setAcademicPeriodId((planning ?? activePeriods[0]).id);
    }
  }, [academicPeriodId, activePeriods]);

  const confirmedOption = useMemo(
    () => options.find((o) => o.status === "CONFIRMED") ?? null,
    [options],
  );

  const draftOptions = useMemo(
    () => options.filter((o) => o.status === "DRAFT"),
    [options],
  );

  async function handleConfirm(option: ScheduleOption) {
    setConfirmingId(option.id);
    try {
      await confirmScheduleOption(option.id);
      toastSuccess(
        "Horario confirmado",
        "Los demás borradores fueron cancelados y los estudiantes podrán ver los cursos disponibles.",
      );
      setPendingOption(null);
      await refreshOptions();
    } catch (error) {
      toastError("No se pudo confirmar", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <PageShell title={t.subpages.confirmSchedule.title} description={t.subpages.confirmSchedule.desc}>
      <div className="space-y-4">
        {/* ── Período ── */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-4 px-5 py-4">
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Período académico</label>
              <select
                value={academicPeriodId}
                onChange={(e) => setAcademicPeriodId(e.target.value)}
                disabled={periodsLoading}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
              >
                {activePeriods.length === 0 && <option value="">Sin períodos activos</option>}
                {activePeriods.map((p) => (
                  <option key={p.id} value={p.id}>{getPeriodLabel(p)}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void refreshOptions()}
              className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground ring-1 ring-border transition hover:bg-muted hover:text-foreground"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>
        </section>

        {/* ── Estado actual ── */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Horario confirmado del período</h2>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod
                ? `Estado actual de ${selectedPeriod.code}`
                : "Selecciona un período académico"}
            </p>
          </div>

          <div className="px-5 py-4">
            {optionsLoading ? (
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
            ) : confirmedOption ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                    <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Horario confirmado
                    </p>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                      {confirmedOption.offerCount} cursos · {confirmedOption.slotCount} bloques · confirmado el{" "}
                      {formatDateTime(confirmedOption.confirmedAt)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`${viewBase}?scheduleId=${confirmedOption.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-white dark:bg-emerald-900/60 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800 transition hover:bg-emerald-50 dark:hover:bg-emerald-900"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver horario
                </Link>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground/80">
                    Aún no hay un horario confirmado para este período.
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Confirma uno de los borradores generados para publicarlo a los estudiantes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Borradores ── */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Borradores disponibles</h2>
              <p className="text-xs text-muted-foreground">
                Compara las opciones generadas y confirma la elegida. Los demás borradores se cancelarán.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {draftOptions.length} {draftOptions.length === 1 ? "borrador" : "borradores"}
            </span>
          </div>

          <div className="divide-y divide-border">
            {optionsLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-[80px] animate-pulse bg-muted/50" />
                ))
              : draftOptions.length > 0
              ? draftOptions.map((option, i) => (
                  <DraftRow
                    key={option.id}
                    option={option}
                    index={i}
                    viewBase={viewBase}
                    confirming={confirmingId === option.id}
                    onConfirm={() => setPendingOption(option)}
                  />
                ))
              : (
                <div className="flex items-start gap-3 px-5 py-8">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground/80">No hay borradores por confirmar.</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Genera nuevos borradores desde el módulo Generar Horario.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={pendingOption !== null}
        onOpenChange={(open) => !open && setPendingOption(null)}
        title="Confirmar este horario"
        description={
          pendingOption
            ? `Se publicará el borrador con ${pendingOption.offerCount} cursos y ${pendingOption.slotCount} bloques. Los estudiantes verán los cursos disponibles del período. Los demás borradores se cancelarán automáticamente. ¿Continuar?`
            : ""
        }
        confirmLabel="Confirmar y publicar"
        isLoading={confirmingId !== null}
        variant="default"
        onConfirm={() => pendingOption && handleConfirm(pendingOption)}
      />
    </PageShell>
  );
}

function DraftRow({
  option,
  index,
  viewBase,
  confirming,
  onConfirm,
}: {
  option: ScheduleOption;
  index: number;
  viewBase: string;
  confirming: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Opción {index + 1}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-px text-[11px] font-medium ring-1",
              "bg-[#f3e8ff] dark:bg-[#6B21A8]/20 text-[#6B21A8] ring-[#e9d5ff] dark:ring-[#6B21A8]/30",
            )}
          >
            Borrador
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{option.offerCount} cursos</span>
          <span>·</span>
          <span>{option.slotCount} bloques</span>
          <span>·</span>
          <span>{formatDateTime(option.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`${viewBase}?scheduleId=${option.id}`}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground ring-1 ring-border transition hover:bg-muted hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          Vista previa
        </Link>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={confirming}
          className="h-8 rounded-lg bg-[#6B21A8] text-xs font-semibold text-white hover:bg-[#581C87] disabled:opacity-50"
        >
          {confirming
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CheckCircle2 className="h-3.5 w-3.5" />}
          Confirmar
        </Button>
        <Link
          href={`${viewBase}?scheduleId=${option.id}`}
          aria-label="Abrir detalle"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition ring-1 ring-border hover:bg-muted hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
