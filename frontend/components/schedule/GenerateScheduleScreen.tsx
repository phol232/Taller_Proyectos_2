"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hash,
  Layers,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import {
  cancelScheduleOption,
  generateScheduleOption,
  getScheduleGenerationRun,
  getScheduleOptions,
} from "@/lib/scheduleApi";
import {
  DEFAULT_TIME_LIMIT_MS,
  RUN_POLL_INTERVAL_MS,
  RUN_POLL_MAX_INTERVAL_MS,
  RUN_STATUS_TIMEOUT_BUFFER_MS,
  TERMINAL_RUN_STATUSES,
  buildGenerateHref,
  buildScheduleViewHref,
  delay,
  formatDateTime,
  formatTermination,
  parseGenerateWizardParams,
  parseSolverSummary,
  type GenerateStep,
  type SolverSummaryMetrics,
} from "@/lib/schedule/generationUtils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { useTranslation } from "@/lib/i18n";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import type { AcademicPeriodAdmin, CarreraAdmin, ClassroomAdmin } from "@/types/admin";
import type { ScheduleGenerationRun, ScheduleOption } from "@/types/schedule";

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

type GenerateScheduleScreenProps = {
  viewBasePath: string;
};

const STEPS = [
  { n: 1 as const, label: "Período", sub: "Año académico y solver" },
  { n: 2 as const, label: "Aulas", sub: "Selección de espacios" },
  { n: 3 as const, label: "Crear borrador", sub: "Revisa y genera" },
  { n: 4 as const, label: "Opciones", sub: "Compara borradores" },
];

function getPeriodLabel(period: AcademicPeriodAdmin) {
  return `${period.code} · ${period.name}`;
}

function getCarreraLabel(carrera: CarreraAdmin) {
  return `${carrera.code} · ${carrera.name}`;
}

async function waitForGenerationRun(
  runId: string,
  timeoutMs: number,
): Promise<ScheduleGenerationRun> {
  const deadline = Date.now() + timeoutMs;
  let latestRun: ScheduleGenerationRun | null = null;
  let pollInterval = RUN_POLL_INTERVAL_MS;

  while (Date.now() <= deadline) {
    latestRun = await getScheduleGenerationRun(runId);
    if (TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      return latestRun;
    }
    await delay(pollInterval);
    pollInterval = Math.min(pollInterval + 500, RUN_POLL_MAX_INTERVAL_MS);
  }

  if (latestRun) return latestRun;
  return getScheduleGenerationRun(runId);
}

export default function GenerateScheduleScreen({ viewBasePath }: GenerateScheduleScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const generateBasePath = viewBasePath.replace(/\/view$/, "/generate");
  const urlWizardOnMount = useRef(parseGenerateWizardParams(searchParams));
  const restoringFromView = urlWizardOnMount.current.returnFrom === "view";
  const initialWizard = urlWizardOnMount.current;
  const [academicPeriodId, setAcademicPeriodId] = useState(
    () => (restoringFromView ? initialWizard.academicPeriodId : undefined) ?? "",
  );
  const [carreraId, setCarreraId] = useState(
    () => (restoringFromView ? initialWizard.carreraId : undefined) ?? "",
  );
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>(
    () => (restoringFromView ? initialWizard.classroomIds : undefined) ?? [],
  );
  const [query, setQuery] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(DEFAULT_TIME_LIMIT_MS);
  const [step, setStep] = useState<GenerateStep>(() => (restoringFromView ? 4 : 1));
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cancellingScheduleId, setCancellingScheduleId] = useState<string | null>(null);
  const [pendingCancelOption, setPendingCancelOption] = useState<ScheduleOption | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [lastSlotCount, setLastSlotCount] = useState<number | null>(null);
  const [lastSolverSummary, setLastSolverSummary] = useState<SolverSummaryMetrics | null>(null);
  const [solverModalOpen, setSolverModalOpen] = useState(false);

  const periodsKey = "/api/academic-periods";
  const carrerasKey = "/api/catalog/carreras";
  const classroomsKey = "/api/classrooms?page=1&pageSize=200";
  const optionsKey = academicPeriodId
    ? `/api/schedules/options?academicPeriodId=${academicPeriodId}`
    : null;

  const { data: academicPeriods = [], isLoading: periodsLoading } =
    useSWR<AcademicPeriodAdmin[]>(periodsKey, () => adminApi.listAcademicPeriods());

  const { data: carreras = [], isLoading: carrerasLoading } = useSWR<CarreraAdmin[]>(
    carrerasKey,
    () => adminApi.listCatalogCarreras(),
  );

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

  const activeCarreras = useMemo(
    () => carreras.filter((c) => c.isActive),
    [carreras],
  );

  const selectedPeriod = useMemo(
    () => activePeriods.find((p) => p.id === academicPeriodId) ?? null,
    [activePeriods, academicPeriodId],
  );

  const selectedCarrera = useMemo(
    () => activeCarreras.find((c) => c.id === carreraId) ?? null,
    [activeCarreras, carreraId],
  );

  const visibleOptions = useMemo(
    () => options.filter((o) => o.status !== "CANCELLED"),
    [options],
  );

  const classroomTypes = useMemo(() => {
    const types = Array.from(new Set(classrooms.map((c) => c.type))).sort((a, b) => a.localeCompare(b));
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

  const optionsReturnTo = useMemo(
    () =>
      buildGenerateHref(generateBasePath, {
        returnFrom: "view",
        academicPeriodId: academicPeriodId || undefined,
        carreraId: carreraId || undefined,
        classroomIds: selectedClassroomIds.length > 0 ? selectedClassroomIds : undefined,
      }),
    [generateBasePath, academicPeriodId, carreraId, selectedClassroomIds],
  );

  useAdminEvents("schedules.changed", () => { void refreshOptions(); });

  useEffect(() => {
    if (restoringFromView && urlWizardOnMount.current.academicPeriodId) return;
    if (!academicPeriodId && activePeriods.length > 0) {
      const planning = activePeriods.find((p) => p.status === "PLANNING");
      setAcademicPeriodId((planning ?? activePeriods[0]).id);
    }
  }, [academicPeriodId, activePeriods, restoringFromView]);

  useEffect(() => {
    if (restoringFromView && urlWizardOnMount.current.carreraId) return;
    if (!carreraId && activeCarreras.length > 0) {
      setCarreraId(activeCarreras[0].id);
    }
  }, [carreraId, activeCarreras, restoringFromView]);

  useEffect(() => {
    if (restoringFromView && urlWizardOnMount.current.classroomIds?.length) return;
    if (selectedClassroomIds.length === 0 && classrooms.length > 0) {
      setSelectedClassroomIds(classrooms.slice(0, 6).map((c) => c.id));
    }
  }, [classrooms, selectedClassroomIds.length, restoringFromView]);

  // Vuelta desde vista de horario: restaurar contexto una vez y limpiar la URL.
  const cleanedReturnUrlRef = useRef(false);
  useEffect(() => {
    if (!restoringFromView || cleanedReturnUrlRef.current) return;
    cleanedReturnUrlRef.current = true;
    router.replace(generateBasePath);
  }, [restoringFromView, generateBasePath, router]);

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

  function closeSolverModal() {
    setSolverModalOpen(false);
    setStep(4);
  }

  function handleStepClick(targetStep: GenerateStep) {
    if (targetStep === 4 && visibleOptions.length === 0) return;
    if (step > targetStep || (targetStep === 4 && visibleOptions.length > 0)) {
      setStep(targetStep);
    }
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
            ? `Se generó una nueva opción con ${generatedOption.slotCount} bloques.`
            : "Revisa el listado de opciones.",
        );
      } else if (run.status === "FAILED" || run.status === "CANCELLED") {
        const firstConflict = run.conflicts[0]?.message;
        toastError(
          "El solver no generó un borrador",
          firstConflict ?? run.summary ?? "Revisa disponibilidad de docentes, aulas y bloques.",
        );
      } else {
        toastSuccess("Generación en proceso", "Actualiza el listado para ver el nuevo borrador.");
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

  const stepSubLabels: Record<GenerateStep, string> = {
    1: selectedCarrera ? `${selectedCarrera.code} · ${Math.round(timeLimitMs / 1000)}s` : "Período y carrera",
    2: `${selectedClassroomIds.length} seleccionadas`,
    3: "Revisa y genera",
    4: `${visibleOptions.length} ${visibleOptions.length === 1 ? "opción" : "opciones"}`,
  };

  return (
    <PageShell title={t.subpages.generateSchedule.title}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

          {/* Stepper */}
          <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
            {STEPS.map(({ n, label }, idx) => {
              const done = step > n;
              const active = step === n;
              const reachable = n === 4 ? visibleOptions.length > 0 : done;
              const sub = stepSubLabels[n];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleStepClick(n)}
                  disabled={!reachable && !active}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 text-left transition sm:px-5",
                    idx < 3 && "sm:border-r border border-border",
                    idx === 1 && "border-r border-border sm:border-r",
                    reachable || active ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#6B21A8] text-white" : "bg-muted text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", active ? "text-[#6B21A8]" : done ? "text-foreground" : "text-muted-foreground")}>
                      {label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className={cn(
            "mx-auto w-full px-6 py-8",
            step === 2 || step === 4 ? "max-w-4xl" : step === 3 ? "max-w-2xl" : "max-w-xl",
          )}>

            {step === 1 && (
              <div className="flex min-h-[340px] flex-col gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">Período académico</label>
                  <select
                    value={academicPeriodId}
                    onChange={(e) => setAcademicPeriodId(e.target.value)}
                    disabled={periodsLoading}
                    aria-label="Período académico"
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                  >
                    {activePeriods.map((p) => (
                      <option key={p.id} value={p.id}>{getPeriodLabel(p)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">Carrera</label>
                  <select
                    value={carreraId}
                    onChange={(e) => setCarreraId(e.target.value)}
                    disabled={carrerasLoading}
                    aria-label="Carrera"
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                  >
                    <option value="">Selecciona una carrera</option>
                    {activeCarreras.map((c) => (
                      <option key={c.id} value={c.id}>{getCarreraLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-auto space-y-3 border-t border-border pt-6">
                  <label className="block text-xs font-semibold text-foreground">Tiempo máximo del solver</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10_000, 20_000, 30_000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTimeLimitMs(val)}
                        className={cn(
                          "h-11 rounded-lg text-sm font-semibold transition",
                          timeLimitMs === val
                            ? "bg-[#6B21A8] text-white shadow-sm"
                            : "bg-muted text-muted-foreground ring-1 ring-border hover:ring-[#6B21A8]/40 hover:text-[#6B21A8]",
                        )}
                      >
                        {Math.round(val / 1000)}s
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Cada generación crea un <span className="font-medium text-foreground/70">borrador independiente</span>.
                    La confirmación se realiza desde Confirmar Horario.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Aulas incluidas</span>
                      <span className="rounded-full bg-[#f3e8ff] dark:bg-[#6B21A8]/20 px-2.5 py-0.5 text-xs font-semibold text-[#6B21A8]">
                        {selectedClassroomIds.length} / {classrooms.length}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={selectVisibleClassrooms}
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-[#6B21A8] ring-1 ring-[#6B21A8]/30 transition hover:bg-[#f3e8ff] dark:hover:bg-[#6B21A8]/20"
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClassroomIds([])}
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por código o tipo…"
                      className="h-9 rounded-lg pl-9 text-sm placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
                    {classroomTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={cn(
                          "h-7 rounded-full px-3 text-xs font-medium transition",
                          typeFilter === type
                            ? "bg-[#6B21A8] text-white"
                            : "bg-muted text-muted-foreground hover:bg-[#ebe5ff] dark:hover:bg-[#6B21A8]/20 hover:text-[#6B21A8]",
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-3">
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
                        <p className="col-span-full rounded-lg bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground ring-1 ring-border">
                          Sin aulas que coincidan.
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    { label: "Seleccionadas", value: selectedClassroomIds.length.toString(), sub: `de ${classrooms.length} disponibles`, accent: true },
                    { label: "Tiempo solver", value: `${Math.round(timeLimitMs / 1000)}s`, accent: true },
                    { label: "Borradores activos", value: options.filter((o) => o.status === "DRAFT").length.toString(), sub: "máx. 5 por período" },
                  ].map(({ label, value, sub, accent }) => (
                    <div key={label} className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center lg:text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-[#6B21A8]" : "text-emerald-700")}>{value}</p>
                      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-muted/50 p-5 sm:p-6">
                  <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Resumen de configuración
                  </p>

                  <div className="space-y-3">
                    <SummaryField
                      label="Período académico"
                      value={selectedPeriod ? `${selectedPeriod.code} · ${selectedPeriod.name}` : "—"}
                    />
                    <SummaryField
                      label="Carrera"
                      value={selectedCarrera ? getCarreraLabel(selectedCarrera) : "—"}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <StatTile label="Tiempo solver" value={`${Math.round(timeLimitMs / 1000)}s`} accent />
                    <StatTile label="Aulas" value={String(selectedClassroomIds.length)} accent />
                    <StatTile
                      label="Borradores"
                      value={`${options.filter((o) => o.status === "DRAFT").length}/5`}
                    />
                  </div>

                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Aulas seleccionadas ({selectedClassrooms.length})
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedClassrooms.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-md bg-[#ede9fe] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#6B21A8] dark:bg-[#6B21A8]/20"
                          title={c.name}
                        >
                          {c.code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#6B21A8] bg-[#faf5ff] p-5 dark:bg-[#6B21A8]/10 sm:p-6">
                  <div className="text-center">
                    <p className="text-base font-semibold text-[#6B21A8]">Crear borrador</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      El solver buscará la mejor distribución en {selectedClassroomIds.length} aulas
                      durante {Math.round(timeLimitMs / 1000)} segundos.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="mt-4 h-11 w-full rounded-lg bg-[#6B21A8] text-sm font-semibold text-white shadow-sm hover:bg-[#581C87] disabled:opacity-50"
                  >
                    {isGenerating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />}
                    Crear borrador
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-base font-semibold text-foreground">Opciones generadas</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compara borradores y revisa el detalle de cada uno
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {remainingRequests !== null && (
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium ring-1",
                        remainingRequests === 0
                          ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900"
                          : "bg-muted text-muted-foreground ring-border",
                      )}>
                        {remainingRequests} generaciones restantes
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => refreshOptions()}
                      aria-label="Actualizar"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition hover:bg-muted hover:text-foreground"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Actualizar
                    </button>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                      {visibleOptions.length} {visibleOptions.length === 1 ? "opción" : "opciones"}
                    </span>
                  </div>
                </div>

                {optionsLoading ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-[180px] animate-pulse rounded-xl bg-muted/50" />
                    ))}
                  </div>
                ) : visibleOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleOptions.map((option, i) => (
                      <ScheduleOptionCard
                        key={option.id}
                        option={option}
                        index={i}
                        cancelling={cancellingScheduleId === option.id}
                        onCancel={() => setPendingCancelOption(option)}
                        onView={() =>
                          router.push(
                            buildScheduleViewHref(viewBasePath, option.id, optionsReturnTo),
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Aún no hay opciones para este período</p>
                      <p className="mt-1 text-xs text-muted-foreground">Configura las aulas y crea el primer borrador.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      className="mt-2 rounded-lg bg-[#6B21A8] text-white hover:bg-[#581C87]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Crear primer borrador
                    </Button>
                  </div>
                )}

                {visibleOptions.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="gap-2 rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                      Modificar aulas
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      className="gap-2 rounded-lg bg-[#6B21A8] text-white hover:bg-[#581C87] disabled:opacity-50"
                    >
                      {isGenerating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Sparkles className="h-4 w-4" />}
                      Generar nuevo borrador
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer nav */}
          {step !== 4 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-3">
              <div className="text-xs text-muted-foreground">
                {step === 1 && (selectedPeriod && selectedCarrera
                  ? <>Período: <span className="font-semibold text-foreground/70">{selectedPeriod.code}</span> · Carrera: <span className="font-semibold text-foreground/70">{selectedCarrera.code}</span></>
                  : "Selecciona período y carrera")}
                {step === 2 && <><span className="font-semibold text-foreground/70">{selectedClassroomIds.length}</span> aulas seleccionadas</>}
                {step === 3 && <>Listo para generar · <span className="font-semibold text-foreground/70">{selectedClassroomIds.length} aulas</span> · <span className="font-semibold text-foreground/70">{Math.round(timeLimitMs / 1000)}s</span></>}
              </div>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as GenerateStep)}
                    className="h-8 rounded-lg bg-muted px-4 text-xs font-medium text-muted-foreground ring-1 ring-border hover:bg-muted/80"
                  >
                    <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Atrás
                  </Button>
                )}
                {step < 3 && (
                  <Button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as GenerateStep)}
                    disabled={(step === 1 && !carreraId) || (step === 2 && selectedClassroomIds.length === 0)}
                    className="h-8 rounded-lg bg-[#6B21A8] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#581C87] disabled:opacity-50"
                  >
                    Continuar <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {step === 3 && visibleOptions.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => setStep(4)}
                    variant="outline"
                    className="h-8 rounded-lg px-4 text-xs font-medium"
                  >
                    Ver opciones <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-3">
              <div className="text-xs text-muted-foreground">
                {selectedPeriod
                  ? <>Período: <span className="font-semibold text-foreground/70">{selectedPeriod.code}</span></>
                  : null}
                {lastSlotCount !== null && (
                  <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                    · Último: {lastSlotCount} bloques
                  </span>
                )}
              </div>
              <Button
                type="button"
                onClick={() => setStep(3)}
                variant="outline"
                className="h-8 rounded-lg px-4 text-xs font-medium"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Volver a configuración
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Modal de resultados */}
      {solverModalOpen && lastSolverSummary !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeSolverModal}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeSolverModal}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Borrador generado</p>
                <p className="text-xs text-muted-foreground">Resumen de la ejecución del solver</p>
              </div>
            </div>

            <div className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
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

              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Bloques asignados</p>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {lastSlotCount !== null ? `${lastSlotCount} bloques` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={closeSolverModal}
              className="mt-5 w-full rounded-xl bg-[#6B21A8] py-2.5 text-sm font-semibold text-white hover:bg-[#581C87]"
            >
              Ver opciones generadas
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
    </PageShell>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-4 py-3 ring-1 ring-border">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1.5 break-words text-sm font-semibold leading-snug text-foreground">{value}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-background px-3 py-3 text-center ring-1 ring-border">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", accent ? "text-[#6B21A8]" : "text-foreground")}>
        {value}
      </p>
    </div>
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
        "flex w-full cursor-pointer flex-col gap-1.5 rounded-lg p-3 text-left transition",
        selected
          ? "bg-[#f3e8ff] dark:bg-[#6B21A8]/20 ring-2 ring-[#6B21A8]"
          : "bg-card ring-1 ring-border hover:bg-[#faf5ff] hover:ring-[#c4b5fd] dark:hover:bg-[#6B21A8]/10",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn(
          "text-xs font-semibold leading-tight",
          selected ? "text-[#6B21A8]" : "text-foreground",
        )}>
          {classroom.name}
        </span>
        <span className={cn(
          "h-2 w-2 shrink-0 rounded-full transition",
          selected ? "bg-[#6B21A8]" : "bg-border",
        )} />
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn(
          "rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide",
          selected ? "bg-[#e9d5ff] dark:bg-[#6B21A8]/30 text-[#6B21A8]" : "bg-muted text-muted-foreground",
        )}>
          {classroom.type}
        </span>
        <span className="text-[10px] text-muted-foreground">{classroom.capacity} pers.</span>
      </span>
    </button>
  );
}

function ScheduleOptionCard({
  option,
  index,
  cancelling,
  onCancel,
  onView,
}: {
  option: ScheduleOption;
  index: number;
  cancelling: boolean;
  onCancel: () => void;
  onView: () => void;
}) {
  const isConfirmed = option.status === "CONFIRMED";
  const isDraft = option.status === "DRAFT";

  return (
    <Card className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-none transition hover:border-[#6B21A8]/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3e8ff] dark:bg-[#6B21A8]/20">
          <CalendarDays className="h-5 w-5 text-[#6B21A8]" />
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
            isConfirmed
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900"
              : "bg-[#f3e8ff] text-[#6B21A8] ring-[#e9d5ff] dark:bg-[#6B21A8]/20 dark:ring-[#6B21A8]/30",
          )}
        >
          {isConfirmed ? "Confirmado" : "Borrador"}
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Opción {index + 1}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(option.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 px-2 py-2">
          <p className="text-lg font-bold text-[#6B21A8]">{option.offerCount}</p>
          <p className="text-[10px] text-muted-foreground">cursos</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-2 py-2">
          <p className="text-lg font-bold text-[#6B21A8]">{option.slotCount}</p>
          <p className="text-[10px] text-muted-foreground">bloques</p>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        {isDraft && (
          <button
            type="button"
            aria-label="Eliminar borrador"
            onClick={onCancel}
            disabled={cancelling}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground ring-1 ring-border transition hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-200 disabled:opacity-50 dark:hover:bg-rose-950/50"
          >
            {cancelling
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Trash2 className="h-4 w-4" />}
          </button>
        )}
        <Button
          type="button"
          onClick={onView}
          className="h-9 flex-1 gap-1.5 rounded-lg bg-[#6B21A8] text-xs font-semibold text-white hover:bg-[#581C87]"
        >
          Ver detalle
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}