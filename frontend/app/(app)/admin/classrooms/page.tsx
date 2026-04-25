"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  DoorOpen,
  FlaskConical,
  Monitor,
  Pencil,
  Plus,
  Power,
  Presentation,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { z } from "zod";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/FormField";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { classroomSchema } from "@/lib/validators/classroom.schema";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AvailabilitySlot, ClassroomAdmin } from "@/types/admin";

// ─── Palette ──────────────────────────────────────────────────────────────────

const CLASSROOM_PALETTE = [
  { icon: DoorOpen,      bg: "bg-violet-100  dark:bg-violet-900/30",  text: "text-violet-600  dark:text-violet-400"  },
  { icon: Building2,     bg: "bg-blue-100    dark:bg-blue-900/30",    text: "text-blue-600    dark:text-blue-400"    },
  { icon: Presentation,  bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { icon: Monitor,       bg: "bg-rose-100    dark:bg-rose-900/30",    text: "text-rose-600    dark:text-rose-400"    },
  { icon: FlaskConical,  bg: "bg-amber-100   dark:bg-amber-900/30",   text: "text-amber-600   dark:text-amber-400"   },
  { icon: CalendarClock, bg: "bg-cyan-100    dark:bg-cyan-900/30",    text: "text-cyan-600    dark:text-cyan-400"    },
];

function getPalette(index: number) {
  return CLASSROOM_PALETTE[index % CLASSROOM_PALETTE.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.join(".");
    if (key && !accumulator[key]) {
      accumulator[key] = issue.message;
    }
    return accumulator;
  }, {});
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Form types ───────────────────────────────────────────────────────────────

type ClassroomFormState = {
  code: string;
  name: string;
  capacity: number;
  type: string;
  isActive: boolean;
  availability: AvailabilitySlot[];
};

const EMPTY_FORM: ClassroomFormState = {
  code: "",
  name: "",
  capacity: 30,
  type: "",
  isActive: true,
  availability: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomAdmin | null>(null);
  const [form, setForm] = useState<ClassroomFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minCapacity, setMinCapacity] = useState<string>("");
  const [maxCapacity, setMaxCapacity] = useState<string>("");

  // Confirmations
  const [confirmDeactivate, setConfirmDeactivate] = useState<ClassroomAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ClassroomAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Availability modal
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [activeClassroom, setActiveClassroom] = useState<ClassroomAdmin | null>(null);
  const [activeClassroomIdx, setActiveClassroomIdx] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadClassrooms = useCallback(async (search: string, pg = page) => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchClassrooms(search.trim(), pg)
        : await adminApi.listClassrooms(pg);
      setClassrooms(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      toastError("No se pudieron cargar las aulas", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  const anyModalOpenRef = useRef(false);
  useEffect(() => {
    anyModalOpenRef.current = availabilityModalOpen || dialogOpen;
  }, [availabilityModalOpen, dialogOpen]);

  useEffect(() => { void loadClassrooms(query, page); }, [query, page, loadClassrooms]);
  useAdminEvents("classrooms.changed", () => {
    if (!anyModalOpenRef.current) void loadClassrooms(query, page);
  });

  // ─── Derived ──────────────────────────────────────────────────────────────

  const types = useMemo(
    () => Array.from(new Set(classrooms.map((c) => c.type).filter((t): t is string => Boolean(t)))).sort(),
    [classrooms],
  );

  const filtered = useMemo(
    () =>
      classrooms.filter((c) => {
        if (statusFilter === "active" && !c.isActive) return false;
        if (statusFilter === "inactive" && c.isActive) return false;
        if (typeFilter !== "all" && c.type !== typeFilter) return false;
        if (minCapacity.trim() && c.capacity < Number(minCapacity)) return false;
        if (maxCapacity.trim() && c.capacity > Number(maxCapacity)) return false;
        return true;
      }),
    [classrooms, statusFilter, typeFilter, minCapacity, maxCapacity],
  );

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (minCapacity.trim() ? 1 : 0) +
    (maxCapacity.trim() ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setTypeFilter("all");
    setMinCapacity("");
    setMaxCapacity("");
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(classroom: ClassroomAdmin) {
    setEditing(classroom);
    setForm({
      code: classroom.code,
      name: classroom.name,
      capacity: classroom.capacity,
      type: classroom.type,
      isActive: classroom.isActive,
      availability: classroom.availability,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function openAvailabilityModal(classroom: ClassroomAdmin, index: number) {
    setActiveClassroom(classroom);
    setActiveClassroomIdx(index);
    setAvailabilityModalOpen(true);
  }

  function onClassroomUpdated(updated: ClassroomAdmin) {
    setClassrooms((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActiveClassroom(updated);
  }

  async function handleSubmit() {
    const result = classroomSchema.safeParse(form);
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...result.data,
        availability: form.availability,
      };
      if (editing) {
        const updated = await adminApi.updateClassroom(editing.id, payload);
        setClassrooms((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toastSuccess("Aula actualizada");
      } else {
        await adminApi.createClassroom(payload);
        toastSuccess("Aula creada");
        await loadClassrooms(query);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      toastError("No se pudo guardar el aula", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(classroom: ClassroomAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateClassroom(classroom.id);
      toastSuccess("Aula desactivada");
      setConfirmDeactivate(null);
      await loadClassrooms(query);
    } catch (error) {
      toastError("No se pudo desactivar el aula", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(classroom: ClassroomAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteClassroom(classroom.id);
      toastSuccess("Aula eliminada");
      setConfirmDelete(null);
      await loadClassrooms(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar el aula",
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarla."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Aulas"
      actions={
        <Button onClick={openCreate} className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]">
          <Plus className="h-4 w-4" />
          Nueva aula
        </Button>
      }
    >
      {/* ── Search + Filters bar ─────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código o nombre…"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <FiltersPopover
          activeCount={activeFiltersCount}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onClear={clearFilters}
          extraFilters={
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Tipo</label>
                <SelectField
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    ...types.map((t) => ({ value: t, label: t })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Capacidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={minCapacity}
                    onChange={(e) => setMinCapacity(e.target.value)}
                    placeholder="Mín."
                  />
                  <Input
                    type="number"
                    min={0}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    placeholder="Máx."
                  />
                </div>
              </div>
            </>
          }
        />
      </div>

      {/* ── Card grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <DoorOpen className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            {query.trim() ? "Sin resultados para esa búsqueda." : "No hay aulas. Crea la primera."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((classroom, idx) => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              paletteIndex={idx}
              onAvailability={() => openAvailabilityModal(classroom, idx)}
              onEdit={() => openEdit(classroom)}
              onDeactivate={() => setConfirmDeactivate(classroom)}
              onDelete={() => setConfirmDelete(classroom)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#ebebeb] pt-4 text-sm">
          <span className="text-[#666666]">
            Página {page} de {totalPages} &mdash; {totalCount} registros
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-[#ebebeb] px-3 py-1 text-xs transition-colors hover:bg-[#f5f5f5] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-[#ebebeb] px-3 py-1 text-xs transition-colors hover:bg-[#f5f5f5] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Availability Modal ───────────────────────────────── */}
      <AvailabilityModal
        open={availabilityModalOpen}
        onOpenChange={setAvailabilityModalOpen}
        classroom={activeClassroom}
        paletteIndex={activeClassroomIdx}
        onUpdated={onClassroomUpdated}
      />

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar aula" : "Nueva aula"}</DialogTitle>
            <DialogDescription>Configura la capacidad, el tipo y la disponibilidad operativa del aula.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Ficha del aula</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Código" error={errors.code}>
                  <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
                </FormField>
                <FormField label="Activo">
                  <SelectField
                    value={String(form.isActive)}
                    onChange={(v) => setForm((p) => ({ ...p, isActive: v === "true" }))}
                    options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]}
                  />
                </FormField>
              </div>
              <FormField label="Nombre" error={errors.name}>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Capacidad" error={errors.capacity}>
                  <Input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                  />
                </FormField>
                <FormField label="Tipo" error={errors.type}>
                  <Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
                </FormField>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Disponibilidad horaria</h3>
              <AvailabilityEditor
                label=""
                value={form.availability}
                onChange={(availability) => setForm((p) => ({ ...p, availability }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmations ────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Desactivar aula"
        description={`¿Desactivar "${confirmDeactivate?.name}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        variant="warning"
        onConfirm={() => confirmDeactivate && void handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar aula"
        description={`Esta acción es permanente. "${confirmDelete?.name}" será eliminada definitivamente. Si tiene asignaciones, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── ClassroomCard ────────────────────────────────────────────────────────────

function ClassroomCard({
  classroom,
  paletteIndex,
  onAvailability,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  classroom: ClassroomAdmin;
  paletteIndex: number;
  onAvailability: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPalette(paletteIndex);
  const Icon = palette.icon;
  const availabilityCount = classroom.availability.length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{classroom.name}</p>
      </div>

      {/* Data rows */}
      <div className="space-y-1.5 px-4 pb-3">
        <InfoRow icon={<Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />} value={classroom.code} mono />
        <InfoRow icon={<DoorOpen className="h-3.5 w-3.5 shrink-0 text-violet-500" />} value={classroom.type} />
        <InfoRow icon={<Users className="h-3.5 w-3.5 shrink-0 text-blue-500" />} value={`${classroom.capacity} vacantes`} />
        <InfoRow
          icon={<CalendarClock className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          value={`${availabilityCount} ${availabilityCount === 1 ? "franja" : "franjas"}`}
        />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              classroom.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white",
            )}
          >
            {classroom.isActive ? "✓" : "✕"}
          </span>
          <span className={cn("text-xs", classroom.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground")}>
            {classroom.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        {classroom.createdAt && (
          <InfoRow icon={<CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" />} value={`Creado: ${formatDate(classroom.createdAt)}`} />
        )}
        {classroom.updatedAt && classroom.updatedAt !== classroom.createdAt && (
          <InfoRow icon={<RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />} value={`Actualizado: ${formatDate(classroom.updatedAt)}`} />
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

      {/* Availability button */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onAvailability}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
            palette.bg,
            palette.text,
            "hover:opacity-80",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Disponibilidad
          {availabilityCount > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-current ring-opacity-30",
                palette.bg,
                palette.text,
              )}
            >
              {availabilityCount}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-1.5 p-3">
        <ActionButton
          label="Editar"
          icon={<Pencil className="h-3.5 w-3.5" />}
          onClick={onEdit}
          variant="neutral"
        />
        <ActionButton
          label="Desactivar"
          icon={<Power className="h-3.5 w-3.5" />}
          onClick={onDeactivate}
          disabled={!classroom.isActive}
          variant="warning"
        />
        <ActionButton
          label="Eliminar"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={onDelete}
          variant="danger"
          className="col-span-2"
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  value,
  mono = false,
}: {
  icon: ReactNode;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={cn("truncate text-xs text-muted-foreground", mono && "font-mono")}>{value}</span>
    </div>
  );
}

// ─── AvailabilityModal ───────────────────────────────────────────────────────

function AvailabilityModal({
  open,
  onOpenChange,
  classroom,
  paletteIndex,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classroom: ClassroomAdmin | null;
  paletteIndex: number;
  onUpdated: (updated: ClassroomAdmin) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const palette = getPalette(paletteIndex);

  useEffect(() => {
    if (open && classroom) setAvailability(classroom.availability);
  }, [open, classroom]);

  async function handleSave() {
    if (!classroom) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateClassroom(classroom.id, {
        code: classroom.code,
        name: classroom.name,
        capacity: classroom.capacity,
        type: classroom.type,
        isActive: classroom.isActive,
        availability,
      });
      onUpdated(updated);
      toastSuccess("Disponibilidad actualizada");
      onOpenChange(false);
    } catch (error) {
      toastError("No se pudo guardar la disponibilidad", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  if (!classroom) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[42rem]">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle>Disponibilidad · {classroom.name}</DialogTitle>
          <DialogDescription>Gestiona las franjas disponibles de esta aula.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b border-border bg-muted/30 px-6 py-3">
          <span className={cn("text-xs", palette.text)}>
            {availability.length} {availability.length === 1 ? "franja registrada" : "franjas registradas"}
          </span>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          <AvailabilityEditor label="" value={availability} onChange={setAvailability} />
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  variant,
  className,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "neutral" | "warning" | "danger";
  className?: string;
}) {
  const variantClass = {
    neutral: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    warning: "text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40",
    danger: "text-red-600 hover:bg-red-500/10 hover:text-red-500",
  }[variant];

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
        variantClass,
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
