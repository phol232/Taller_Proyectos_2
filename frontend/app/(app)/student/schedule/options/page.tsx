"use client";
// Generación de horarios en borrador con hold de cupo (2 min): el estudiante
// genera varias opciones, las compara con su contador y confirma una.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { adminApi } from "@/lib/adminApi";
import {
  confirmStudentScheduleOption,
  generateStudentScheduleOption,
  getCurrentStudent,
  getStudentScheduleOptions,
  releaseStudentScheduleOption,
  renewStudentScheduleOption,
} from "@/lib/studentScheduleApi";
import type { AcademicPeriodAdmin, CarreraAdmin } from "@/types/admin";
import type { StudentMe, StudentScheduleOption } from "@/types/studentSchedule";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 25;

function formatPeriod(p: AcademicPeriodAdmin) {
  return `${p.code} · ${p.name}`;
}

function remainingSeconds(expiresAt: string, now: number): number {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StudentScheduleOptionsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [periodId, setPeriodId] = useState<string>(() => search.get("periodId") ?? "");
  const [carreraId, setCarreraId] = useState<string>(() => search.get("carreraId") ?? "");
  const [now, setNow] = useState<number>(() => Date.now());
  const [generating, setGenerating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ scheduleId: string; optionIndex: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ scheduleId: string; optionIndex: number } | null>(null);
  const [contextReady, setContextReady] = useState(
    () => Boolean(search.get("periodId")),
  );
  const contextResolvedRef = useRef(Boolean(search.get("periodId")));

  const { data: me } = useSWR<StudentMe>("/api/students/me", () => getCurrentStudent());
  const { data: periods = [] } = useSWR<AcademicPeriodAdmin[]>(
    "/api/academic-periods",
    () => adminApi.listAcademicPeriods(),
  );
  const activePeriods = useMemo(() => periods.filter((p) => p.isActive), [periods]);

  const { data: carreras = [] } = useSWR<CarreraAdmin[]>(
    "/api/catalog/carreras",
    () => adminApi.listCatalogCarreras(),
  );
  const activeCarreras = useMemo(() => carreras.filter((c) => c.isActive), [carreras]);

  // Si entra sin período en la URL, busca borradores vivos y abre ese período.
  useEffect(() => {
    if (contextResolvedRef.current || !me || activePeriods.length === 0) return;

    const urlPeriod = search.get("periodId");
    const urlCarrera = search.get("carreraId");

    if (urlCarrera) {
      setCarreraId(urlCarrera);
    } else if (me.carreraId) {
      setCarreraId(me.carreraId);
    }

    if (urlPeriod) {
      setPeriodId(urlPeriod);
      contextResolvedRef.current = true;
      setContextReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      for (const period of activePeriods) {
        try {
          const live = await getStudentScheduleOptions(me.id, period.id);
          if (cancelled) return;
          if (live.length > 0) {
            setPeriodId(period.id);
            contextResolvedRef.current = true;
            setContextReady(true);
            return;
          }
        } catch {
          // Si un período falla, seguimos con el siguiente.
        }
      }

      if (!cancelled) {
        setPeriodId(activePeriods[0]?.id ?? "");
        contextResolvedRef.current = true;
        setContextReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, activePeriods, search]);

  // Reloj para el contador regresivo.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const optionsKey = me && periodId ? `student-options-${me.id}-${periodId}` : null;
  const {
    data: options = [],
    isLoading,
    mutate,
  } = useSWR<StudentScheduleOption[]>(
    optionsKey,
    () => getStudentScheduleOptions(me!.id, periodId),
    { keepPreviousData: true },
  );

  const handleGenerate = useCallback(async () => {
    if (!me || !periodId || !carreraId) return;
    setGenerating(true);
    setWarning(null);
    try {
      const baseline = (await getStudentScheduleOptions(me.id, periodId)).length;
      const result = await generateStudentScheduleOption(me.id, periodId);
      if (result.warning) setWarning(result.warning);

      // El solver corre async: esperamos a que aparezca una nueva opción.
      let appeared = false;
      for (let i = 0; i < POLL_MAX_ATTEMPTS; i += 1) {
        await sleep(POLL_INTERVAL_MS);
        const fresh = await getStudentScheduleOptions(me.id, periodId);
        await mutate(fresh, { revalidate: false });
        if (fresh.length > baseline) {
          appeared = true;
          break;
        }
      }
      if (!appeared) {
        toastError(
          "No se pudo generar",
          "No hay horarios disponibles para tus cursos en este momento. Intenta más tarde.",
        );
      }
    } catch {
      // El interceptor global ya muestra el error de red/servidor.
    } finally {
      setGenerating(false);
    }
  }, [me, periodId, carreraId, mutate]);

  const handleConfirm = useCallback(
    async (scheduleId: string) => {
      if (!me) return;
      setConfirmingId(scheduleId);
      try {
        await confirmStudentScheduleOption(me.id, scheduleId);
        toastSuccess("Horario confirmado", "Tu horario quedó registrado.");
        router.push("/student/my-schedule");
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        const message = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string } | undefined)?.message
          : undefined;
        if (status === 409) {
          toastError(
            "Cupo ya no disponible",
            message ?? "Ese cupo se agotó. Genera una nueva opción.",
          );
        } else {
          toastError("No se pudo confirmar", message ?? "Intenta nuevamente.");
        }
        await mutate();
      } finally {
        setConfirmingId(null);
      }
    },
    [me, router, mutate],
  );

  const handleRenew = useCallback(
    async (scheduleId: string) => {
      if (!me) return;
      setBusyId(scheduleId);
      try {
        await renewStudentScheduleOption(me.id, scheduleId);
        await mutate();
      } finally {
        setBusyId(null);
      }
    },
    [me, mutate],
  );

  const handleDiscard = useCallback(
    async (scheduleId: string) => {
      if (!me) return;
      setBusyId(scheduleId);
      try {
        await releaseStudentScheduleOption(me.id, scheduleId);
        await mutate();
      } finally {
        setBusyId(null);
      }
    },
    [me, mutate],
  );

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.optionIndex - b.optionIndex),
    [options],
  );

  return (
    <PageShell title="Generar mi horario">
      <div className="space-y-4">
        {sortedOptions.length > 0 && (
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-end gap-3 px-5 py-4">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">Carrera</label>
                <select
                  value={carreraId}
                  onChange={(e) => setCarreraId(e.target.value)}
                  aria-label="Carrera"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                >
                  <option value="">Selecciona tu carrera</option>
                  {activeCarreras.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">Período académico</label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  aria-label="Período académico"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                >
                  <option value="">Selecciona el período</option>
                  {activePeriods.map((p) => (
                    <option key={p.id} value={p.id}>{formatPeriod(p)}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!periodId || !carreraId || generating}
                className="h-10 gap-2 bg-[#6B21A8] text-white hover:bg-[#581c87]"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generando…" : "Generar opción"}
              </Button>
            </div>
          </section>
        )}

        {warning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {(!contextReady || isLoading) ? (
          <div className="h-[200px] animate-pulse rounded-xl bg-muted/40" />
        ) : sortedOptions.length === 0 ? (
          <div className="mx-auto w-full max-w-xl pt-6">
            <Card className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-none">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "rgba(107,33,168,0.07)", color: "#6B21A8" }}
              >
                <CalendarClock className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Genera tu horario</p>
                <p className="text-sm text-muted-foreground">
                  Elige tu carrera y el período académico para empezar.
                </p>
              </div>

              <div className="w-full space-y-3 text-left">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">Carrera</label>
                  <select
                    value={carreraId}
                    onChange={(e) => setCarreraId(e.target.value)}
                    aria-label="Carrera"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                  >
                    <option value="">Selecciona tu carrera</option>
                    {activeCarreras.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">Período académico</label>
                  <select
                    value={periodId}
                    onChange={(e) => setPeriodId(e.target.value)}
                    aria-label="Período académico"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#6B21A8] focus:ring-2 focus:ring-[#6B21A8]/20"
                  >
                    <option value="">Selecciona el período</option>
                    {activePeriods.map((p) => (
                      <option key={p.id} value={p.id}>{formatPeriod(p)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!periodId || !carreraId || generating}
                className="h-11 w-full gap-2 bg-[#6B21A8] text-white hover:bg-[#581c87]"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generando…" : "Generar mi horario"}
              </Button>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedOptions.map((opt, idx) => {
              const displayNumber = idx + 1;
              const remaining = remainingSeconds(opt.expiresAt, now);
              const expired = remaining <= 0;
              const urgent = remaining > 0 && remaining <= 30;
              const isConfirming = confirmingId === opt.scheduleId;
              const isBusy = busyId === opt.scheduleId;
              return (
                <Card
                  key={opt.scheduleId}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-none",
                    expired ? "border-border opacity-60" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Opción {displayNumber}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                        expired
                          ? "bg-muted text-muted-foreground"
                          : urgent
                            ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
                      )}
                    >
                      <CalendarClock className="h-3 w-3" />
                      {expired ? "Expirada" : formatClock(remaining)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {opt.itemCount} curso{opt.itemCount === 1 ? "" : "s"} en esta opción
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/student/schedule/options/view?scheduleId=${opt.scheduleId}&n=${displayNumber}&periodId=${periodId}&carreraId=${carreraId}`)}
                    className="h-9 w-full gap-1.5"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Ver horario
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/student/schedule/builder?periodId=${periodId}&importFrom=${opt.scheduleId}`)}
                    className="h-9 w-full gap-1.5"
                  >
                    Ajustar manualmente
                  </Button>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setConfirmTarget({ scheduleId: opt.scheduleId, optionIndex: displayNumber })}
                      disabled={expired || isConfirming || isBusy}
                      className="h-9 flex-1 gap-1.5 bg-[#6B21A8] text-white hover:bg-[#581c87]"
                    >
                      {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRenew(opt.scheduleId)}
                      disabled={expired || isBusy || isConfirming}
                      title="Renovar el tiempo de reserva"
                      className="h-9 w-9 p-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteTarget({ scheduleId: opt.scheduleId, optionIndex: displayNumber })}
                      disabled={isBusy || isConfirming}
                      title="Descartar esta opción"
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(o) => { if (!o) setConfirmTarget(null); }}
        title="¿Confirmar este horario?"
        description={
          confirmTarget
            ? `Se registrará la Opción ${confirmTarget.optionIndex} como tu horario del período y se descartarán las demás. Esta acción ocupa tu cupo.`
            : ""
        }
        confirmLabel="Sí, confirmar"
        isLoading={confirmingId !== null}
        onConfirm={async () => {
          if (!confirmTarget) return;
          const id = confirmTarget.scheduleId;
          setConfirmTarget(null);
          await handleConfirm(id);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="¿Descartar esta opción?"
        description={
          deleteTarget
            ? `La Opción ${deleteTarget.optionIndex} se eliminará y su cupo reservado se liberará.`
            : ""
        }
        variant="destructive"
        confirmLabel="Sí, descartar"
        isLoading={busyId !== null}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const id = deleteTarget.scheduleId;
          setDeleteTarget(null);
          await handleDiscard(id);
        }}
      />
    </PageShell>
  );
}
