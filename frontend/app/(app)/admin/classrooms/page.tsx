"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
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
  X,
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
import type { AvailabilitySlot, ClassroomAdmin, CourseAdmin, CourseComponentAdmin } from "@/types/admin";

// ─── Palette ──────────────────────────────────────────────────────────────────

const CLASSROOM_PALETTE = [
  { icon: DoorOpen,      bg: "bg-violet-100  dark:bg-violet-900/30",  text: "text-violet-600  dark:text-violet-400"  },
  { icon: Building2,     bg: "bg-blue-100    dark:bg-blue-900/30",    text: "text-blue-600    dark:text-blue-400"    },
  { icon: Presentation,  bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { icon: Monitor,       bg: "bg-rose-100    dark:bg-rose-900/30",    text: "text-rose-600    dark:text-rose-400"    },
  { icon: FlaskConical,  bg: "bg-amber-100   dark:bg-amber-900/30",   text: "text-amber-600   dark:text-amber-400"   },
  { icon: CalendarClock, bg: "bg-cyan-100    dark:bg-cyan-900/30",    text: "text-cyan-600    dark:text-cyan-400"    },
];

const COMPONENT_LABELS: Record<string, string> = {
  GENERAL:  "General",
  THEORY:   "Teoría",
  PRACTICE: "Práctica",
};

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
  courseCodes: string[];
};

const EMPTY_FORM: ClassroomFormState = {
  code: "",
  name: "",
  capacity: 30,
  type: "",
  isActive: true,
  availability: [],
  courseCodes: [],
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

  // Courses modal
  const [coursesModalOpen, setCoursesModalOpen] = useState(false);

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
    anyModalOpenRef.current = availabilityModalOpen || coursesModalOpen || dialogOpen;
  }, [availabilityModalOpen, coursesModalOpen, dialogOpen]);

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
      courseCodes: classroom.courseCodes ?? [],
    });
    setErrors({});
    setDialogOpen(true);
  }

  function openAvailabilityModal(classroom: ClassroomAdmin, index: number) {
    setActiveClassroom(classroom);
    setActiveClassroomIdx(index);
    setAvailabilityModalOpen(true);
  }

  function openCoursesModal(classroom: ClassroomAdmin, index: number) {
    setActiveClassroom(classroom);
    setActiveClassroomIdx(index);
    setCoursesModalOpen(true);
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
        courseCodes: form.courseCodes,
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
              onCourses={() => openCoursesModal(classroom, idx)}
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
      {/* ── Courses Modal ──────────────────────────────────── */}
      <ClassroomCoursesModal
        open={coursesModalOpen}
        onOpenChange={setCoursesModalOpen}
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
  onCourses,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  classroom: ClassroomAdmin;
  paletteIndex: number;
  onAvailability: () => void;
  onCourses: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPalette(paletteIndex);
  const Icon = palette.icon;
  const availabilityCount = classroom.availability.length;
  const courseCount = (classroom.courseCodes ?? []).length;

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
        <InfoRow
          icon={<BookOpen className="h-3.5 w-3.5 shrink-0 text-cyan-500" />}
          value={`${courseCount} ${courseCount === 1 ? "curso asignado" : "cursos asignados"}`}
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

      {/* Availability + Courses buttons */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3">
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
        <button
          type="button"
          onClick={onCourses}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
            palette.bg,
            palette.text,
            "hover:opacity-80",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Cursos asignados
          {courseCount > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-current ring-opacity-30",
                palette.bg,
                palette.text,
              )}
            >
              {courseCount}
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

// ─── ClassroomCoursesModal ───────────────────────────────────────────────────

function ClassroomCoursesModal({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<Record<string, CourseAdmin>>({});
  const [searchResults, setSearchResults] = useState<CourseAdmin[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmRemoveCourse, setConfirmRemoveCourse] = useState<CourseAdmin | null>(null);
  const [pendingCourse, setPendingCourse] = useState<CourseAdmin | null>(null);
  const [pendingComponentIds, setPendingComponentIds] = useState<string[]>([]);
  const [pendingIsEdit, setPendingIsEdit] = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());
  const palette = getPalette(paletteIndex);

  const assignedCodes        = useMemo(() => classroom?.courseCodes       ?? [], [classroom]);
  const assignedComponentIds = useMemo(() => classroom?.courseComponentIds ?? [], [classroom]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setPendingCourse(null);
      setPendingComponentIds([]);
    }
  }, [open]);

  const prevClassroomIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && classroom && classroom.id !== prevClassroomIdRef.current) {
      prevClassroomIdRef.current = classroom.id;
      setResolved({});
      attemptedRef.current = new Set();
    }
  }, [open, classroom]);

  useEffect(() => {
    if (!open || !classroom) return;
    const missing = assignedCodes.filter((code) => !attemptedRef.current.has(code));
    if (missing.length === 0) return;
    missing.forEach((code) => attemptedRef.current.add(code));
    let cancelled = false;
    (async () => {
      try {
        const list = await adminApi.findCoursesByCodes(missing);
        if (cancelled) return;
        const next: Record<string, CourseAdmin> = {};
        for (const course of list) next[course.code] = course;
        if (Object.keys(next).length > 0) setResolved((prev) => ({ ...prev, ...next }));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [assignedCodes, open, classroom]);

  useEffect(() => {
    if (!open || !classroom) return;
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await adminApi.searchCourses(q, 1, 8);
        if (cancelled) return;
        setSearchResults(data.content);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, searchQuery, classroom]);

  async function saveState(
    nextComponentIds: string[],
    nextCourseCodes: string[],
    successMessage: string,
    errorTitle: string,
  ) {
    if (!classroom) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateClassroom(classroom.id, {
        code: classroom.code,
        name: classroom.name,
        capacity: classroom.capacity,
        type: classroom.type,
        isActive: classroom.isActive,
        availability: classroom.availability,
        courseCodes: nextCourseCodes,
        courseComponentIds: nextComponentIds,
      });
      onUpdated(updated);
      toastSuccess(successMessage);
    } catch (error) {
      toastError(errorTitle, getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  function handleSelectCourseFromSearch(course: CourseAdmin) {
    const alreadyAssigned = assignedCodes.includes(course.code) && !pendingCourse;
    if (alreadyAssigned) return;
    const components = course.components ?? [];
    if (components.length === 0) {
      // Curso sin componentes: agregar directo
      setResolved((prev) => ({ ...prev, [course.code]: course }));
      setSearchQuery("");
      setSearchResults([]);
      void saveState(
        assignedComponentIds,
        [...assignedCodes, course.code],
        "Curso asignado",
        "No se pudo asignar el curso",
      );
      return;
    }
    setResolved((prev) => ({ ...prev, [course.code]: course }));
    setSearchQuery("");
    setSearchResults([]);
    setPendingCourse(course);
    setPendingComponentIds(components.map((c) => c.id).filter((id): id is string => id !== null));
    setPendingIsEdit(false);
  }

  function handleEditCourse(course: CourseAdmin, currentIds: string[]) {
    setPendingCourse(course);
    setPendingComponentIds(currentIds);
    setPendingIsEdit(true);
  }

  function handleTogglePendingComponent(id: string) {
    setPendingComponentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleConfirmPendingCourse() {
    if (!pendingCourse) return;
    const components = pendingCourse.components ?? [];
    const courseCompIds = components.map((c) => c.id);

    let nextComponentIds: string[];
    let nextCourseCodes: string[];

    if (pendingIsEdit) {
      // Reemplazar solo los componentes de este curso
      const othersCompIds = assignedComponentIds.filter((id) => !courseCompIds.includes(id));
      nextComponentIds = [...othersCompIds, ...pendingComponentIds];
      nextCourseCodes = pendingComponentIds.length > 0
        ? assignedCodes
        : assignedCodes.filter((c) => c !== pendingCourse.code);
    } else {
      nextComponentIds = [...assignedComponentIds, ...pendingComponentIds];
      nextCourseCodes = [...assignedCodes, pendingCourse.code];
    }

    const isAdd = !pendingIsEdit;
    void saveState(
      nextComponentIds,
      nextCourseCodes,
      isAdd ? "Curso asignado" : "Tipos de clase actualizados",
      isAdd ? "No se pudo asignar el curso" : "No se pudo actualizar los tipos de clase",
    );
    setPendingCourse(null);
    setPendingComponentIds([]);
  }

  function handleRemoveCourse(course: CourseAdmin) {
    const courseCompIds = (course.components ?? []).map((c) => c.id);
    const nextComponentIds = assignedComponentIds.filter((id) => !courseCompIds.includes(id));
    const nextCourseCodes  = assignedCodes.filter((c) => c !== course.code);
    void saveState(nextComponentIds, nextCourseCodes, "Curso quitado", "No se pudo quitar el curso");
    setConfirmRemoveCourse(null);
  }

  if (!classroom) return null;

  const totalCourses = assignedCodes.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[42rem]">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <DialogTitle>Cursos asignados · {classroom.name}</DialogTitle>
            <DialogDescription>Gestiona los cursos y sus tipos de clase (teoría, práctica) para esta aula.</DialogDescription>
          </DialogHeader>

          {/* Barra de estadísticas */}
          <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-2.5">
            <span className={cn("text-xs font-medium", palette.text)}>
              {totalCourses} {totalCourses === 1 ? "curso" : "cursos"} asignados
            </span>
          </div>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">

            {/* Sección pendiente: selección de componentes */}
            {pendingCourse && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-700 dark:bg-violet-950/20">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                      Editar tipos de clase
                    </p>
                    <p className="mt-0.5 truncate font-bold text-foreground">
                      <span className="mr-2">{pendingCourse.code}</span>
                      <span className="font-normal text-muted-foreground text-sm">{pendingCourse.name}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPendingCourse(null); setPendingComponentIds([]); }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Subtítulo */}
                <p className="mb-3 text-sm text-muted-foreground">
                  Selecciona los tipos de clase que se pueden dictar en esta aula:
                </p>

                {/* Cards de componentes */}
                <div className="grid grid-cols-2 gap-3">
                  {(pendingCourse.components ?? []).map((comp) => {
                    if (!comp.id) return null;
                    const selected = pendingComponentIds.includes(comp.id);
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => handleTogglePendingComponent(comp.id!)}
                        className={cn(
                          "relative flex flex-col rounded-xl border p-4 text-left transition",
                          selected
                            ? "border-violet-400 bg-violet-100 dark:border-violet-600 dark:bg-violet-900/40"
                            : "border-border bg-background hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20",
                        )}
                      >
                        <span className={cn("font-semibold text-sm", selected ? "text-violet-700 dark:text-violet-300" : "text-foreground")}>
                          {COMPONENT_LABELS[comp.componentType] ?? comp.componentType}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {comp.weeklyHours}h/sem{comp.requiredRoomType ? ` · ${comp.requiredRoomType}` : ""}
                        </span>
                        {selected && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                            <svg viewBox="0 0 12 10" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 5 4.5 8.5 11 1" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pie con botones */}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setPendingCourse(null); setPendingComponentIds([]); }}
                    className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={saving || pendingComponentIds.length === 0}
                    onClick={handleConfirmPendingCourse}
                    className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            )}

            {/* Buscador */}
            <div className="space-y-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar curso para asignar…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {searchQuery.trim().length > 0 && (
                <div className="overflow-hidden rounded-xl border border-input bg-popover shadow-sm">
                  {searchLoading ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Buscando…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      Sin resultados para &ldquo;{searchQuery}&rdquo;
                    </p>
                  ) : (
                    <div className="max-h-52 divide-y divide-border overflow-y-auto">
                      {searchResults.map((course) => {
                        const alreadyAssigned = assignedCodes.includes(course.code);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            disabled={saving || alreadyAssigned}
                            onClick={() => !alreadyAssigned && handleSelectCourseFromSearch(course)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-violet-900/30"
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-foreground">{course.code}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{course.name}</span>
                            </div>
                            <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                              {alreadyAssigned ? "Ya asignado" : `Ciclo ${course.cycle ?? 1} · ${course.credits} cr`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grilla 2 columnas de cursos asignados */}
            {totalCourses === 0 ? (
              !searchQuery.trim() && !pendingCourse && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
                  <BookOpen className="h-6 w-6 opacity-40" />
                  <p className="text-sm">Esta aula no tiene cursos asignados.</p>
                  <p className="text-xs opacity-70">Busca un curso arriba para comenzar.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {assignedCodes.map((code) => {
                  const course = resolved[code] ?? null;
                  const components: CourseComponentAdmin[] = course?.components ?? [];
                  const selectedCompIds = assignedComponentIds.filter((id) =>
                    components.some((c) => c.id === id),
                  );
                  return (
                    <div
                      key={code}
                      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm text-violet-700 dark:text-violet-400">{code}</p>
                          {course && <p className="truncate text-xs text-muted-foreground leading-tight">{course.name}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {course && components.length > 0 && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleEditCourse(course, selectedCompIds)}
                              className="rounded-md p-1 text-muted-foreground transition hover:bg-violet-100 hover:text-violet-600 disabled:opacity-50 dark:hover:bg-violet-900/30"
                              title="Editar tipos de clase"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setConfirmRemoveCourse(course ?? ({ code } as CourseAdmin))}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title="Quitar curso"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        {course ? (
                          selectedCompIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedCompIds.map((id) => {
                                const comp = components.find((c) => c.id === id);
                                if (!comp) return null;
                                return (
                                  <span
                                    key={id}
                                    className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                  >
                                    {COMPONENT_LABELS[comp.componentType] ?? comp.componentType}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Ciclo {course.cycle ?? 1} · {course.credits} cr · {course.weeklyHours}h/sem
                            </p>
                          )
                        ) : (
                          <p className="text-xs text-amber-500">Cargando…</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmRemoveCourse}
        onOpenChange={(o) => !o && setConfirmRemoveCourse(null)}
        title="Quitar curso"
        description={`¿Quitar "${confirmRemoveCourse?.code}${confirmRemoveCourse?.name ? ` – ${confirmRemoveCourse.name}` : ""}" de esta aula?`}
        confirmLabel="Quitar"
        variant="destructive"
        onConfirm={() => confirmRemoveCourse && handleRemoveCourse(confirmRemoveCourse)}
        isLoading={saving}
      />
    </>
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
        courseCodes: classroom.courseCodes ?? [],
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
