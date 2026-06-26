"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import axios from "axios";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import OptionTimetableGrid from "@/components/schedule/student/OptionTimetableGrid";
import { toastError, toastSuccess } from "@/lib/utils";
import {
  confirmStudentScheduleOption,
  getCurrentStudent,
  getStudentOptionTimetable,
} from "@/lib/studentScheduleApi";
import type { StudentMe } from "@/types/studentSchedule";
import type { TimetableSlot } from "@/types/schedule";

export default function StudentOptionTimetablePage() {
  const router = useRouter();
  const search = useSearchParams();
  const scheduleId = search.get("scheduleId") ?? "";
  const optionLabel = search.get("n");
  const periodId = search.get("periodId") ?? "";
  const carreraId = search.get("carreraId") ?? "";
  const backHref = `/student/schedule/options${
    periodId ? `?periodId=${periodId}${carreraId ? `&carreraId=${carreraId}` : ""}` : ""
  }`;

  const [confirming, setConfirming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: me } = useSWR<StudentMe>("/api/students/me", () => getCurrentStudent());

  const { data: slots = [], isLoading } = useSWR<TimetableSlot[]>(
    me && scheduleId ? `option-timetable-${scheduleId}` : null,
    () => getStudentOptionTimetable(me!.id, scheduleId),
  );

  const handleConfirm = async () => {
    if (!me) return;
    setConfirming(true);
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
        toastError("Cupo ya no disponible", message ?? "Ese cupo se agotó. Genera una nueva opción.");
        router.push(backHref);
      } else {
        toastError("No se pudo confirmar", message ?? "Intenta nuevamente.");
      }
    } finally {
      setConfirming(false);
      setConfirmOpen(false);
    }
  };

  return (
    <PageShell
      title={optionLabel ? `Horario · Opción ${optionLabel}` : "Horario de la opción"}
      description="Revisa la distribución semanal y confirma si es la que prefieres."
      actions={
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      }
    >
      <div className="space-y-4">
        {!scheduleId ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se indicó una opción de horario.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <OptionTimetableGrid slots={slots} />
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!scheduleId || isLoading || slots.length === 0 || confirming}
            className="h-10 gap-2 bg-[#6B21A8] text-white hover:bg-[#581c87]"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar este horario
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Confirmar este horario?"
        description="Se registrará como tu horario del período y se descartarán las demás opciones. Esta acción ocupa tu cupo."
        confirmLabel="Sí, confirmar"
        onConfirm={handleConfirm}
        isLoading={confirming}
      />
    </PageShell>
  );
}
