import type { ScheduleGenerationRun } from "@/types/schedule";

export const DEFAULT_TIME_LIMIT_MS = 20_000;
export const RUN_POLL_INTERVAL_MS = 1_000;
export const RUN_POLL_MAX_INTERVAL_MS = 3_000;
export const RUN_STATUS_TIMEOUT_BUFFER_MS = 10_000;

export const TERMINAL_RUN_STATUSES = new Set<ScheduleGenerationRun["status"]>([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export type SolverSummaryMetrics = {
  durationMs: number | null;
  attempts: number | null;
  candidates: number | null;
  roomGaps: number | null;
  roomGapMinutes: number | null;
  weekendBlocks: number | null;
  termination: string | null;
};

export type GenerateStep = 1 | 2 | 3 | 4;

export type GenerateWizardParams = {
  returnFrom?: "view";
  academicPeriodId?: string;
  carreraId?: string;
  classroomIds?: string[];
};

export function parseGenerateStep(value: string | null): GenerateStep | null {
  if (value === "1" || value === "2" || value === "3" || value === "4") {
    return Number(value) as GenerateStep;
  }
  return null;
}

export function parseGenerateWizardParams(
  searchParams: Pick<URLSearchParams, "get">,
): GenerateWizardParams {
  const returnFrom = searchParams.get("returnFrom") === "view" ? "view" : undefined;
  const academicPeriodId = searchParams.get("academicPeriodId") ?? undefined;
  const carreraId = searchParams.get("carreraId") ?? undefined;
  const classroomIdsRaw = searchParams.get("classroomIds");
  const classroomIds = classroomIdsRaw
    ? classroomIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : undefined;

  return {
    returnFrom,
    academicPeriodId: academicPeriodId || undefined,
    carreraId: carreraId || undefined,
    classroomIds: classroomIds?.length ? classroomIds : undefined,
  };
}

export function buildGenerateHref(
  basePath: string,
  params: GenerateWizardParams,
): string {
  const search = new URLSearchParams();
  if (params.returnFrom) search.set("returnFrom", params.returnFrom);
  if (params.academicPeriodId) search.set("academicPeriodId", params.academicPeriodId);
  if (params.carreraId) search.set("carreraId", params.carreraId);
  if (params.classroomIds?.length) search.set("classroomIds", params.classroomIds.join(","));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Solo permite rutas internas relativas (evita open redirect). */
export function safeInternalReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function buildScheduleViewHref(
  viewBasePath: string,
  scheduleId: string,
  returnTo?: string,
): string {
  const params = new URLSearchParams({ scheduleId });
  if (returnTo) params.set("returnTo", returnTo);
  return `${viewBasePath}?${params.toString()}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseSolverSummary(summary: string | null): SolverSummaryMetrics {
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
  let totalDurationMs: number | null = null;
  let totalAttempts: number | null = null;
  let totalCandidates: number | null = null;
  for (const part of summary.split(";")) {
    const [rawKey, rawValue] = part.trim().split("=");
    if (!rawKey || rawValue === undefined) continue;
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (key === "duration_ms") metrics.durationMs = Number(value);
    if (key === "total_duration_ms") totalDurationMs = Number(value);
    if (key === "attempts") metrics.attempts = Number(value);
    if (key === "total_attempts") totalAttempts = Number(value);
    if (key === "candidates") metrics.candidates = Number(value);
    if (key === "total_candidates") totalCandidates = Number(value);
    if (key === "room_gaps") metrics.roomGaps = Number(value);
    if (key === "room_gap_minutes") metrics.roomGapMinutes = Number(value);
    if (key === "weekend_blocks") metrics.weekendBlocks = Number(value);
    if (key === "termination") metrics.termination = value;
  }
  if (totalDurationMs !== null) metrics.durationMs = totalDurationMs;
  if (totalAttempts !== null) metrics.attempts = totalAttempts;
  if (totalCandidates !== null) metrics.candidates = totalCandidates;
  return metrics;
}

export function formatTermination(value: string | null): { label: string; sub: string } {
  if (value === "TIME_LIMIT_REACHED") {
    return { label: "Tiempo agotado", sub: "El solver usó todo el tiempo disponible" };
  }
  if (value === "LOCAL_SEARCH_COMPLETE") {
    return { label: "Solución encontrada", sub: "El solver halló la mejor distribución posible" };
  }
  return { label: "Finalizado", sub: "El solver terminó su ejecución" };
}
