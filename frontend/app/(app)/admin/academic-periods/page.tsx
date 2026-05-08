"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { createElement } from "react";
import {
  CalendarDays,
  Clock,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
  RefreshCw,
  GraduationCap,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { academicPeriodSchema } from "@/lib/validators/academic-period.schema";
import { toastError, toastSuccess, cn } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AcademicPeriodAdmin } from "@/types/admin";

// ─── Paleta de iconos/colores para periodos académicos ─────────────────────────

const PERIOD_PALETTE = [
  { icon: CalendarDays, bg: "bg-violet-100", text: "text-violet-600", darkBg: "dark:bg-violet-900/30", darkText: "dark:text-violet-400" },
  { icon: Clock,        bg: "bg-blue-100",    text: "text-blue-600",    darkBg: "dark:bg-blue-900/30",    darkText: "dark:text-blue-400" },
  { icon: BookOpen,     bg: "bg-emerald-100", text: "text-emerald-600", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-400" },
  { icon: GraduationCap,bg: "bg-rose-100",    text: "text-rose-600",    darkBg: "dark:bg-rose-900/30",    darkText: "dark:text-rose-400" },
  { icon: CalendarCheck,bg: "bg-amber-100",   text: "text-amber-600",   darkBg: "dark:bg-amber-900/30",   darkText: "dark:text-amber-400" },
  { icon: Tag,          bg: "bg-cyan-100",    text: "text-cyan-600",    darkBg: "dark:bg-cyan-900/30",    darkText: "dark:text-cyan-400" },
];

function getPeriodPalette(index: number) {
  return PERIOD_PALETTE[index % PERIOD_PALETTE.length];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "PLANNING": return "Planificación";
    case "ACTIVE": return "Activo";
    case "CLOSED": return "Cerrado";
    default: return status;
  }
}

// ─── Formularios ───────────────────────────────────────────────────────────────

type AcademicPeriodFormState = {
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "PLANNING" | "ACTIVE" | "CLOSED";
  maxStudentCredits: number;
  isActive: boolean;
};

function createEmptyForm(): AcademicPeriodFormState {
  return {
    code: "",
    name: "",
    startsAt: "",
    endsAt: "",
    status: "PLANNING",
    maxStudentCredits: 22,
    isActive: true,
  };
}

type LifecycleFilter = "all" | "PLANNING" | "ACTIVE" | "CLOSED";
type StatusFilter = "all" | "active" | "inactive";

// ─── Página principal ──────────────────────────────────────────────────────────

export default function AcademicPeriodsPage() {
  const [periods, setPeriods] = useState<AcademicPeriodAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicPeriodAdmin | null>(null);
  const [form, setForm] = useState<AcademicPeriodFormState>(() => createEmptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");

  const [confirmActivate, setConfirmActivate] = useState<AcademicPeriodAdmin | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AcademicPeriodAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicPeriodAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadPeriods(query);
  }, [query]);

  useAdminEvents("academic-periods.changed", () => void loadPeriods(query));

  async function loadPeriods(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchAcademicPeriods(search.trim())
        : await adminApi.listAcademicPeriods();
      setPeriods(data);
    } catch (error) {
      toastError("No se pudieron cargar los períodos", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      periods.filter((p) => {
        if (statusFilter === "active" && !p.isActive) return false;
        if (statusFilter === "inactive" && p.isActive) return false;
        if (lifecycleFilter !== "all" && p.status !== lifecycleFilter) return false;
        return true;
      }),
    [periods, statusFilter, lifecycleFilter]
  );

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (lifecycleFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setLifecycleFilter("all");
  }

  function openCreate() {
    setEditing(null);
    setForm(createEmptyForm());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(period: AcademicPeriodAdmin) {
    setEditing(period);
    setForm({
      code: period.code,
      name: period.name,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      status: period.status,
      maxStudentCredits: period.maxStudentCredits,
      isActive: period.isActive,
    });
    setErrors({});
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const result = academicPeriodSchema.safeParse(form);
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await adminApi.updateAcademicPeriod(editing.id, result.data);
        toastSuccess("Período actualizado");
      } else {
        await adminApi.createAcademicPeriod(result.data);
        toastSuccess("Período creado");
      }
      setDialogOpen(false);
      setForm(createEmptyForm());
      await loadPeriods(query);
    } catch (error) {
      toastError("No se pudo guardar el período", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(period: AcademicPeriodAdmin) {
    setActionLoading(true);
    try {
      await adminApi.activateAcademicPeriod(period.id);
      toastSuccess("Período activado");
      setConfirmActivate(null);
      await loadPeriods(query);
    } catch (error) {
      toastError("No se pudo activar el período", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(period: AcademicPeriodAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateAcademicPeriod(period.id);
      toastSuccess("Período desactivado");
      setConfirmDeactivate(null);
      await loadPeriods(query);
    } catch (error) {
      toastError("No se pudo desactivar el período", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(period: AcademicPeriodAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteAcademicPeriod(period.id);
      toastSuccess("Período eliminado");
      setConfirmDelete(null);
      await loadPeriods(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar el período",
        getApiErrorMessage(error, "Tiene ofertas asociadas. Considera desactivarlo.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <PageShell
      title="Períodos académicos"
      actions={
        <Button onClick={openCreate} size="md">
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      }
    >
      {/* ── Búsqueda y filtros ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
          <SelectField
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "Todos los estados" },
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
          <SelectField
            value={lifecycleFilter}
            onChange={(v) => setLifecycleFilter(v as LifecycleFilter)}
            options={[
              { value: "all", label: "Todas las etapas" },
              { value: "PLANNING", label: "Planificación" },
              { value: "ACTIVE", label: "Activo" },
              { value: "CLOSED", label: "Cerrado" },
            ]}
          />
        </div>
      </div>

      {/* ── Grid de tarjetas ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <CalendarDays className="h-8 w-8 opacity-40" />
          <p className="text-sm">No hay períodos académicos. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((period, idx) => (
            <PeriodCard
              key={period.id}
              period={period}
              paletteIndex={idx}
              onEdit={() => openEdit(period)}
              onActivate={() => setConfirmActivate(period)}
              onDeactivate={() => setConfirmDeactivate(period)}
              onDelete={() => setConfirmDelete(period)}
            />
          ))}
        </div>
      )}

      {/* ── Modal crear/editar ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar período académico" : "Nuevo período académico"}</DialogTitle>
            <DialogDescription>Configura el ciclo académico que luego usarán las ofertas y el solver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Código" error={errors.code}>
              <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
            </FormField>
            <FormField label="Nombre" error={errors.name}>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </FormField>
            <FormField label="Fecha de inicio" error={errors.startsAt}>
              <Input type="date" value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
            </FormField>
            <FormField label="Fecha de fin" error={errors.endsAt}>
              <Input type="date" value={form.endsAt} onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
            </FormField>
            <FormField label="Etapa" error={errors.status}>
              <SelectField
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as AcademicPeriodFormState["status"] }))}
                options={[
                  { value: "PLANNING", label: "Planificación" },
                  { value: "ACTIVE", label: "Activo" },
                  { value: "CLOSED", label: "Cerrado" },
                ]}
              />
            </FormField>
            <FormField label="Máximo de créditos" error={errors.maxStudentCredits}>
              <Input type="number" value={form.maxStudentCredits} onChange={(event) => setForm((prev) => ({ ...prev, maxStudentCredits: Number(event.target.value) }))} />
            </FormField>
            <FormField label="Estado" error={errors.isActive}>
              <SelectField
                value={String(form.isActive)}
                onChange={(v) => setForm((prev) => ({ ...prev, isActive: v === "true" }))}
                options={[
                  { value: "true", label: "Activo" },
                  { value: "false", label: "Inactivo" },
                ]}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button size="md" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Guardando…" : editing ? "Guardar período" : "Crear período"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmaciones ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmActivate}
        onOpenChange={(open) => !open && setConfirmActivate(null)}
        title="Activar período académico"
        description={`¿Activar "${confirmActivate?.name}"?`}
        confirmLabel="Activar"
        variant="warning"
        onConfirm={() => confirmActivate && handleActivate(confirmActivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desactivar período académico"
        description={`¿Desactivar "${confirmDeactivate?.name}"? Podrá reactivarse luego.`}
        confirmLabel="Desactivar"
        variant="warning"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar período académico"
        description={`Esta acción es permanente. "${confirmDelete?.name}" será eliminado definitivamente. Si tiene ofertas asociadas, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── PeriodCard ────────────────────────────────────────────────────────────────

function PeriodCard({
  period,
  paletteIndex,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  period: AcademicPeriodAdmin;
  paletteIndex: number;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPeriodPalette(paletteIndex);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header con icono grande + nombre */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg, palette.darkBg)}>
          {createElement(palette.icon, { className: cn("h-7 w-7", palette.text, palette.darkText) })}
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{period.name}</p>
      </div>

      {/* Datos con iconos individuales */}
      <div className="space-y-1.5 px-4 pb-3">
        <DataRow icon={<Tag className="h-3.5 w-3.5 text-amber-500" />} label={period.code} mono />
        <DataRow
          icon={
            <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold", period.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white")}>
              {period.isActive ? "✓" : "✕"}
            </span>
          }
          label={period.isActive ? "Activo" : "Inactivo"}
          labelClass={period.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground"}
        />
        <DataRow
          icon={<CalendarDays className="h-3.5 w-3.5 text-indigo-400" />}
          label={`${fmtShortDate(period.startsAt)} → ${fmtShortDate(period.endsAt)}`}
        />
        <DataRow icon={<CalendarCheck className="h-3.5 w-3.5 text-violet-400" />} label={`Etapa: ${statusLabel(period.status)}`} />
        <DataRow icon={<BookOpen className="h-3.5 w-3.5 text-sky-400" />} label={`Créditos máx: ${period.maxStudentCredits}`} />
        {period.createdAt && (
          <DataRow icon={<CalendarDays className="h-3.5 w-3.5 text-indigo-400" />} label={`Creado: ${fmtDate(period.createdAt)}`} />
        )}
        {period.updatedAt && period.updatedAt !== period.createdAt && (
          <DataRow icon={<RefreshCw className="h-3.5 w-3.5 text-sky-400" />} label={`Actualizado: ${fmtDate(period.updatedAt)}`} />
        )}
      </div>

      <div className="border-t border-border mx-4" />

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-1.5 p-3">
        <ActionButton label="Editar" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} variant="neutral" />
        {period.isActive ? (
          <ActionButton label="Desactivar" icon={<Power className="h-3.5 w-3.5" />} onClick={onDeactivate} variant="warning" />
        ) : (
          <ActionButton label="Activar" icon={<Power className="h-3.5 w-3.5" />} onClick={onActivate} variant="warning" />
        )}
        <ActionButton label="Eliminar" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} variant="danger" className="col-span-2" />
      </div>
    </div>
  );
}

// ─── DataRow ───────────────────────────────────────────────────────────────────

function DataRow({
  icon,
  label,
  mono,
  labelClass,
}: {
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className={cn("text-xs text-muted-foreground", mono && "font-mono", labelClass)}>
        {label}
      </span>
    </div>
  );
}

// ─── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  variant,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "neutral" | "warning" | "danger";
  className?: string;
}) {
  const variantClass = {
    neutral: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    warning: "text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-40 disabled:cursor-not-allowed",
    danger: "text-red-600 hover:bg-red-500/10 hover:text-red-500",
  }[variant];

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
        variantClass,
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Helpers de validación ───────────────────────────────────────────────────

function flattenErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.join(".");
    if (key && !accumulator[key]) {
      accumulator[key] = issue.message;
    }
    return accumulator;
  }, {});
}
