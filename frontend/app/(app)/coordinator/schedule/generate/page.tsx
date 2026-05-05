"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Hash,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import {
  cancelScheduleOption,
  confirmScheduleOption,
  generateScheduleOption,
  getScheduleGenerationRun,
  getScheduleOptions,
} from "@/lib/scheduleApi";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { useTranslation } from "@/lib/i18n";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import type { AcademicPeriodAdmin, ClassroomAdmin } from "@/types/admin";
import type { ScheduleGenerationRun, ScheduleOption } from "@/types/schedule";

const DEFAULT_TIME_LIMIT_MS = 20_000;
const RUN_POLL_INTERVAL_MS = 1_000;
const RUN_STATUS_TIMEOUT_BUFFER_MS = 10_000;
const TERMINAL_RUN_STATUSES = new Set<ScheduleGenerationRun["status"]>([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

type SolverSummaryMetrics = {
  durationMs: number | null;
  attempts: number | null;
  candidates: number | null;
  roomGaps: number | null;
  roomGapMinutes: number | null;
  weekendBlocks: number | null;
  termination: string | null;
};

type RateLimitError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      retryAfterSeconds?: number;
      remaining?: number;
    };
  };
};

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSolverSummary(summary: string | null): SolverSummaryMetrics {
  const metrics: SolverSummaryMetrics = {
    durationMs: null,
    attempts: null,
    candidates: null,
    roomGaps: null,
    roomGapMinutes: null,
    weekendBlocks: null,
    termination: null,
  };
  if (!summary) return metrics;
  for (const part of summary.split(";")) {
    const [rawKey, rawValue] = part.trim().split("=");
    if (!rawKey || rawValue === undefined) continue;
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (key === "duration_ms") metrics.durationMs = Number(value);
    if (key === "attempts") metrics.attempts = Number(value);
    if (key === "candidates") metrics.candidates = Number(value);
    if (key === "room_gaps") metrics.roomGaps = Number(value);
    if (key === "room_gap_minutes") metrics.roomGapMinutes = Number(value);
    if (key === "weekend_blocks") metrics.weekendBlocks = Number(value);
    if (key === "termination") metrics.termination = value;
  }
  return metrics;
}

function formatTermination(value: string | null): { label: string; sub: string } {
  if (value === "TIME_LIMIT_REACHED") return { label: "Tiempo agotado", sub: "El solver usó todo el tiempo disponible" };
  if (value === "LOCAL_SEARCH_COMPLETE") return { label: "Solución encontrada", sub: "El solver halló la mejor distribución posible" };
  return { label: "Finalizado", sub: "El solver terminó su ejecución" };
}

async function waitForGenerationRun(
  runId: string,
  timeoutMs: number,
): Promise<ScheduleGenerationRun> {
  const deadline = Date.now() + timeoutMs;
  let latestRun: ScheduleGenerationRun | null = null;

  while (Date.now() <= deadline) {
    latestRun = await getScheduleGenerationRun(runId);
    if (TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      return latestRun;
    }
    await delay(RUN_POLL_INTERVAL_MS);
  }

  if (latestRun) return latestRun;
  return getScheduleGenerationRun(runId);
}

export default function GenerateSchedulePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [academicPeriodId, setAcademicPeriodId] = useState("");
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(DEFAULT_TIME_LIMIT_MS);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmingScheduleId, setConfirmingScheduleId] = useState<string | null>(null);
  const [cancellingScheduleId, setCancellingScheduleId] = useState<string | null>(null);
  const [pendingCancelOption, setPendingCancelOption] = useState<ScheduleOption | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [lastSlotCount, setLastSlotCount] = useState<number | null>(null);
  const [lastSolverSummary, setLastSolverSummary] = useState<SolverSummaryMetrics | null>(null);
  const [solverModalOpen, setSolverModalOpen] = useState(false);

  const periodsKey = "/api/academic-periods";
  const classroomsKey = "/api/classrooms?page=1&pageSize=200";
  const optionsKey = academicPeriodId
    ? `/api/schedules/options?academicPeriodId=${academicPeriodId}`
    : null;

  const { data: academicPeriods = [], isLoading: periodsLoading } =
    useSWR<AcademicPeriodAdmin[]>(periodsKey, () => adminApi.listAcademicPeriods());

  const { data: classroomPage, isLoading: classroomsLoading } = useSWR(
    classroomsKey,
    () => adminApi.listClassrooms(1, 200),
  );

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

  const classrooms = useMemo(
    () => classroomPage?.content ?? [],
    [classroomPage?.content],
  );

  const selectedPeriod = useMemo(
    () => activePeriods.find((p) => p.id === academicPeriodId) ?? null,
    [activePeriods, academicPeriodId],
  );

  const classroomTypes = useMemo(() => {
    const types = Array.from(new Set(classrooms.map((c) => c.type))).sort();
    return ["TODOS", ...types];
  }, [classrooms]);

  const filteredClassrooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classrooms.filter((c) => {
      const matchesType = typeFilter === "TODOS" || c.type === typeFilter;
      const matchesQuery = !q || `${c.code} ${c.name} ${c.type}`.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [classrooms, query, typeFilter]);

  const selectedClassrooms = useMemo(
    () => classrooms.filter((c) => selectedClassroomIds.includes(c.id)),
    [classrooms, selectedClassroomIds],
  );

  const canGenerate = Boolean(academicPeriodId) && selectedClassroomIds.length > 0 && !isGenerating;

  useAdminEvents("schedules.changed", () => { void refreshOptions(); });

  useEffect(() => {
    if (!academicPeriodId && activePeriods.length > 0) {
      const planning = activePeriods.find((p) => p.status === "PLANNING");
      setAcademicPeriodId((planning ?? activePeriods[0]).id);
    }
  }, [academicPeriodId, activePeriods]);

  useEffect(() => {
    if (selectedClassroomIds.length === 0 && classrooms.length > 0) {
      setSelectedClassroomIds(classrooms.slice(0, 6).map((c) => c.id));
    }
  }, [classrooms, selectedClassroomIds.length]);

  function toggleClassroom(id: string) {
    setSelectedClassroomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectVisibleClassrooms() {
    setSelectedClassroomIds((prev) => {
      const merged = new Set(prev);
      filteredClassrooms.forEach((c) => merged.add(c.id));
      return Array.from(merged);
    });
  }

  async function handleGenerate() {
    if (!academicPeriodId) { toastError("Selecciona un período académico."); return; }
    if (selectedClassroomIds.length === 0) { toastError("Selecciona al menos un aula."); return; }

    setIsGenerating(true);
    try {
      const response = await generateScheduleOption({
        academicPeriodId,
        classroomIds: selectedClassroomIds,
        timeLimitMs,
      });
      setRemainingRequests(response.remaining);
      toastSuccess("Generación iniciada", "El solver está procesando un nuevo borrador.");
      const run = await waitForGenerationRun(
        response.solverRunId,
        timeLimitMs + RUN_STATUS_TIMEOUT_BUFFER_MS,
      );
      const updated = await refreshOptions();
      const summary = parseSolverSummary(run.summary);
      setLastSolverSummary(summary);
      if (run.status === "SUCCEEDED") {
        setSolverModalOpen(true);
        const generatedOption = updated?.find((option) =>
          option.solverRunId === run.solverRunId ||
          (run.teachingScheduleId !== null && option.id === run.teachingScheduleId),
        ) ?? updated?.[0];
        if (generatedOption) {
          setLastSlotCount(generatedOption.slotCount);
        }
        toastSuccess(
          "Borrador creado",
          generatedOption
            ? `Se listó una nueva opción con ${generatedOption.slotCount} bloques.`
            : "Actualiza la lista si no aparece inmediatamente.",
        );
      } else if (run.status === "FAILED" || run.status === "CANCELLED") {
        const firstConflict = run.conflicts[0]?.message;
        toastError(
          "El solver no generó un borrador",
          firstConflict ?? run.summary ?? "Revisa disponibilidad de docentes, aulas y bloques.",
        );
      } else {
        toastSuccess("Generación en proceso", "Usa actualizar en el resumen para refrescar el listado.");
      }
    } catch (error) {
      const rateLimit = error as RateLimitError;
      if (rateLimit.response?.status === 429) {
        const seconds = rateLimit.response.data?.retryAfterSeconds ?? 300;
        setRemainingRequests(rateLimit.response.data?.remaining ?? 0);
        toastError("Límite alcanzado", `Vuelve a intentar en ${seconds}s.`);
      } else {
        toastError("No se pudo generar", getApiErrorMessage(error, "Revisa el solver y vuelve a intentar."));
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConfirm(scheduleId: string) {
    setConfirmingScheduleId(scheduleId);
    try {
      await confirmScheduleOption(scheduleId);
      toastSuccess("Horario confirmado", "Los demás borradores fueron cancelados.");
      await refreshOptions();
    } catch (error) {
      toastError("No se pudo confirmar", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setConfirmingScheduleId(null);
    }
  }

  async function handleCancel(scheduleId: string) {
    setCancellingScheduleId(scheduleId);
    try {
      await cancelScheduleOption(scheduleId);
      toastSuccess("Borrador eliminado");
      setPendingCancelOption(null);
      await refreshOptions();
    } catch (error) {
      const updatedOptions = await refreshOptions();
      const scheduleStillExists = (updatedOptions ?? options).some((option) => option.id === scheduleId);

      if (!scheduleStillExists) {
        toastSuccess("Borrador eliminado");
        setPendingCancelOption(null);
        return;
      }

      toastError("No se pudo eliminar", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setCancellingScheduleId(null);
    }
  }

  return (
    <PageShell
      title={t.subpages.generateSchedule.title}
    >
      <div className="space-y-4">
        {/* ── Wizard ── */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

          {/* Stepper header */}
          <div className="grid grid-cols-3 border-b border-border">
            {([
              { n: 1, label: "Período", sub: "Año académico y solver" },
              { n: 2, label: "Aulas", sub: `${selectedClassroomIds.length} seleccionadas` },
              { n: 3, label: "Crear borrador", sub: "Revisa y genera" },
            ] as const).map(({ n, label, sub }, idx) => {
              const done = step > n;
              const active = step === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => done && setStep(n)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 text-left transition",
                    idx < 2 && "border-r border-border",
                    done ? "cursor-pointer hover:bg-muted" : "cursor-default",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#6B21A8] text-white" : "bg-[#f0f0f0] text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", active ? "text-[#6B21A8]" : done ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                    <p className="truncate text-[11px] text-muted-foreground/60">{sub}</p>
                  </div>
                  {active && <div className="ml-auto h-0.5 w-6 rounded-full bg-[#6B21A8] self-end mb-0" />}
                </button>
              );
            })}
          </div>

          {/* Step content — centered, max-w */}
          <div className={cn("mx-auto w-full px-6 py-8", step === 2 ? "max-w-4xl" : "max-w-2xl")}>

            {/* ── Step 1: Período ── */}
            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">Período académico</label>
                  <select
                    value={academicPeriodId}
                    onChange={(e) => setAcademicPeriodId(e.target.value)}
                    disabled={periodsLoading}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                  >
                    {activePeriods.map((p) => (
                      <option key={p.id} value={p.id}>{getPeriodLabel(p)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">Tiempo máximo del solver</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10_000, 20_000, 30_000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTimeLimitMs(val)}
                        className={cn(
                          "h-10 rounded-lg text-sm font-semibold transition",
                          timeLimitMs === val
                            ? "bg-[#6B21A8] text-white shadow-sm"
                            : "bg-white text-foreground/80 ring-1 ring-[#e5e5e5] hover:ring-[#6B21A8]/40 hover:text-[#6B21A8]",
                        )}
                      >
                        {Math.round(val / 1000)}s
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada generación crea un <span className="font-medium text-foreground/70">borrador independiente</span>.
                    Confirmar uno cancela los demás del período.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 2: Aulas ── */}
            {step === 2 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
                {/* Left: classroom picker */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Aulas incluidas</span>
                      <span className="rounded-full bg-[#f3e8ff] px-2.5 py-0.5 text-xs font-semibold text-[#6B21A8]">
                        {selectedClassroomIds.length} / {classrooms.length}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={selectVisibleClassrooms}
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-[#6B21A8] ring-1 ring-[#6B21A8]/30 transition hover:bg-[#f3e8ff]"
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClassroomIds([])}
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground/80"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por código o tipo…"
                      className="h-9 rounded-lg border-border pl-9 text-sm placeholder:text-muted-foreground/40"
                    />
                  </div>

                  {/* Type filter pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {classroomTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={cn(
                          "h-7 rounded-full px-3 text-xs font-medium transition",
                          typeFilter === t
                            ? "bg-[#6B21A8] text-white"
                            : "bg-[#f5f5f5] text-foreground/80 hover:bg-[#ebe5ff] hover:text-[#6B21A8]",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto p-0.5">
                    {classroomsLoading
                      ? Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="h-[64px] animate-pulse rounded-lg bg-muted" />
                        ))
                      : filteredClassrooms.length > 0
                      ? filteredClassrooms.map((c) => (
                          <ClassroomToggle
                            key={c.id}
                            classroom={c}
                            selected={selectedClassroomIds.includes(c.id)}
                            onToggle={() => toggleClassroom(c.id)}
                          />
                        ))
                      : (
                        <p className="col-span-3 rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground ring-1 ring-border">
                          Sin aulas que coincidan.
                        </p>
                      )}
                  </div>
                </div>

                {/* Right: metrics */}
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Seleccionadas", value: selectedClassroomIds.length.toString(), sub: `de ${classrooms.length} disponibles`, accent: true },
                    { label: "Tiempo solver", value: `${Math.round(timeLimitMs / 1000)}s`, accent: true },
                    { label: "Borradores activos", value: options.filter((o) => o.status === "DRAFT").length.toString(), sub: "máx. 5 por período" },
                  ].map(({ label, value, sub, accent }) => (
                    <div key={label} className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-[#6B21A8]" : "text-emerald-600")}>{value}</p>
                      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Crear borrador ── */}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Summary */}
                <div className="rounded-xl border border-border bg-muted/50 p-5">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Resumen de configuración</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Período", value: selectedPeriod ? `${selectedPeriod.code} · ${selectedPeriod.name}` : "—" },
                      { label: "Tiempo solver", value: `${Math.round(timeLimitMs / 1000)}s`, accent: true },
                      { label: "Aulas incluidas", value: `${selectedClassroomIds.length} aulas`, accent: true },
                      { label: "Borradores activos", value: `${options.filter((o) => o.status === "DRAFT").length} / 5` },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn("font-semibold", accent ? "text-[#6B21A8]" : "text-foreground")}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selectedClassrooms.slice(0, 12).map((c) => (
                      <span key={c.id} className="rounded-full bg-[#ede9fe] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#6B21A8]">
                        {c.code}
                      </span>
                    ))}
                    {selectedClassrooms.length > 12 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{selectedClassrooms.length - 12} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex flex-col gap-4 rounded-xl border-2 border-[#6B21A8] bg-[#faf5ff] p-5">
                  <div>
                    <p className="font-semibold text-[#6B21A8]">Crear borrador</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      El solver ejecutará {Math.round(timeLimitMs / 1000)}s buscando la mejor distribución
                      de bloques en {selectedClassroomIds.length} aulas. El resultado se añadirá a Opciones generadas.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="w-full rounded-lg bg-[#6B21A8] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#581C87] disabled:opacity-50"
                  >
                    {isGenerating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />}
                    Crear borrador
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {step === 1 && (selectedPeriod ? <>Período: <span className="font-semibold text-foreground/80">{selectedPeriod.code} · {selectedPeriod.name.split(" ").slice(0, 3).join(" ")}</span></> : "Selecciona un período")}
              {step === 2 && <><span className="font-semibold text-foreground/80">{selectedClassroomIds.length}</span> aulas seleccionadas para el solver</>}
              {step === 3 && <>Listo para generar · <span className="font-semibold text-foreground/80">{selectedClassroomIds.length} aulas</span> · <span className="font-semibold text-foreground/80">{Math.round(timeLimitMs / 1000)}s</span></>}
            </div>
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="h-8 rounded-lg bg-card px-4 text-xs font-medium text-foreground/80 ring-1 ring-border hover:bg-muted"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Atrás
                </Button>
              )}
              {step < 3 && (
                <Button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 2 && selectedClassroomIds.length === 0}
                  className="h-8 rounded-lg bg-[#6B21A8] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#581C87] disabled:opacity-50"
                >
                  Continuar <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </section>

      {/* ── Options table ── */}
      <section className="card-elevated rounded-xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Opciones generadas</h2>
            <p className="text-xs text-muted-foreground">Compara borradores y aprueba el elegido</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastSlotCount !== null && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800">
                  Último: <strong>{lastSlotCount}</strong> bloques
                </p>
              </div>
            )}
            {remainingRequests !== null && (
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1",
                remainingRequests === 0
                  ? "bg-rose-50 text-rose-600 ring-rose-200"
                  : "bg-muted text-muted-foreground ring-border",
              )}>
                {remainingRequests} generaciones restantes
              </span>
            )}
            <button
              type="button"
              onClick={() => refreshOptions()}
              aria-label="Actualizar"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground/90"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {options.filter(o => o.status !== "CANCELLED").length} {options.filter(o => o.status !== "CANCELLED").length === 1 ? "opción" : "opciones"}
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {optionsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[80px] animate-pulse bg-muted" />
              ))
            : options.length > 0
            ? options.map((option, i) => (
                <ScheduleOptionRow
                  key={option.id}
                  option={option}
                  index={i}
                  confirming={confirmingScheduleId === option.id}
                  cancelling={cancellingScheduleId === option.id}
                  onConfirm={() => handleConfirm(option.id)}
                  onCancel={() => setPendingCancelOption(option)}
                  onView={() => router.push(`/coordinator/schedule/view?scheduleId=${option.id}`)}
                />
              ))
            : (
              <div className="flex items-start gap-3 px-5 py-8">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-medium text-foreground/90">Aún no hay opciones para este período.</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Configura las aulas y crea el primer borrador.</p>
                </div>
              </div>
            )}
        </div>
      </section>

      {/* ── Solver summary modal ── */}
      {solverModalOpen && lastSolverSummary !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSolverModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X */}
            <button
              type="button"
              onClick={() => setSolverModalOpen(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Borrador generado</p>
                <p className="text-xs text-muted-foreground">Resumen de la ejecución del solver</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Duración */}
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Clock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="text-sm font-semibold text-foreground">
                    {lastSolverSummary.durationMs !== null ? `${lastSolverSummary.durationMs} ms` : "—"}
                  </p>
                </div>
              </div>

              {/* Terminación */}
              {(() => {
                const term = formatTermination(lastSolverSummary.termination);
                return (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <Zap className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Estado de terminación</p>
                      <p className="text-sm font-semibold text-foreground">{term.label}</p>
                      <p className="text-[11px] text-muted-foreground">{term.sub}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Iteraciones + Candidatos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Hash className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Iteraciones</p>
                    <p className="text-sm font-semibold text-foreground">
                      {lastSolverSummary.attempts !== null ? lastSolverSummary.attempts : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Candidatos</p>
                    <p className="text-sm font-semibold text-foreground">
                      {lastSolverSummary.candidates !== null ? lastSolverSummary.candidates.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloques totales */}
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald-700">Bloques asignados</p>
                  <p className="text-sm font-semibold text-emerald-800">
                    {lastSlotCount !== null ? `${lastSlotCount} bloques` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setSolverModalOpen(false)}
              className="mt-5 w-full rounded-xl bg-[#6B21A8] py-2.5 text-sm font-semibold text-white hover:bg-[#581C87]"
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingCancelOption !== null}
        onOpenChange={(open) => {
          if (!open && cancellingScheduleId === null) setPendingCancelOption(null);
        }}
        title="Eliminar borrador"
        description={
          pendingCancelOption
            ? `Se cancelará la opción creada el ${formatDateTime(pendingCancelOption.createdAt)}. Esta acción no publicará cambios para estudiantes.`
            : "Se cancelará este borrador."
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={cancellingScheduleId !== null}
        onConfirm={() => {
          if (pendingCancelOption) {
            void handleCancel(pendingCancelOption.id);
          }
        }}
      />
    </div>
    </PageShell>
  );
}

function ClassroomToggle({
  classroom,
  selected,
  onToggle,
}: {
  classroom: ClassroomAdmin;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg p-3 text-left transition cursor-pointer w-full",
        selected
          ? "bg-[#f3e8ff] ring-2 ring-[#6B21A8]"
          : "bg-card ring-1 ring-border hover:ring-[#c4b5fd] hover:bg-[#f5f0ff] dark:hover:bg-[#6B21A8]/10",
      )}
    >
      {/* Name + dot */}
      <span className="flex items-center justify-between gap-2">
        <span className={cn(
          "text-xs font-semibold leading-tight",
          selected ? "text-[#6B21A8]" : "text-foreground",
        )}>
          {classroom.name}
        </span>
        <span className={cn(
          "h-2 w-2 shrink-0 rounded-full transition",
          selected ? "bg-[#6B21A8]" : "bg-[#e5e5e5]",
        )} />
      </span>
      {/* Type + capacity */}
      <span className="flex items-center gap-1.5">
        <span className={cn(
          "rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide",
          selected ? "bg-[#e9d5ff] text-[#6B21A8]" : "bg-[#f0f0f0] text-muted-foreground",
        )}>
          {classroom.type}
        </span>
        <span className="text-[10px] text-muted-foreground/60">{classroom.capacity} pers.</span>
      </span>
    </button>
  );
}

function ScheduleOptionRow({
  option,
  index,
  confirming,
  cancelling,
  onConfirm,
  onCancel,
  onView,
}: {
  option: ScheduleOption;
  index: number;
  confirming: boolean;
  cancelling: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onView: () => void;
}) {
  const isConfirmed = option.status === "CONFIRMED";
  const isDraft = option.status === "DRAFT";

  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Opción {index + 1}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-px text-[11px] font-medium ring-1",
              isConfirmed
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-[#f3e8ff] text-[#6B21A8] ring-[#e9d5ff]",
            )}
          >
            {isConfirmed ? "Confirmado" : "Borrador"}
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
        {isDraft && (
          <button
            type="button"
            aria-label="Eliminar borrador"
            onClick={onCancel}
            disabled={cancelling}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/40 transition ring-1 ring-border hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 hover:ring-rose-200 disabled:opacity-50"
          >
            {cancelling
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={isConfirmed || confirming}
          className={cn(
            "h-8 rounded-lg text-xs",
            isConfirmed
              ? "bg-muted text-muted-foreground ring-1 ring-border"
              : "bg-foreground text-background hover:bg-foreground/80",
          )}
        >
          {confirming
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CheckCircle2 className="h-3.5 w-3.5" />}
          {isConfirmed ? "Aprobado" : "Aprobar"}
        </Button>
        <button
          type="button"
          aria-label="Ver detalle"
          onClick={onView}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition ring-1 ring-border hover:bg-muted hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
