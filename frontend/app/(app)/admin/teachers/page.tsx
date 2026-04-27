"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
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
import { teacherSchema } from "@/lib/validators/teacher.schema";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import { joinFullName, splitFullName } from "@/lib/fullName";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AvailabilitySlot, CourseAdmin, CourseComponentAdmin, TeacherAdmin } from "@/types/admin";

// ─── Palette ──────────────────────────────────────────────────────────────────

const TEACHER_PALETTE = [
  { icon: GraduationCap,    bg: "bg-violet-100  dark:bg-violet-900/30",  text: "text-violet-600  dark:text-violet-400"  },
  { icon: User,             bg: "bg-blue-100    dark:bg-blue-900/30",    text: "text-blue-600    dark:text-blue-400"    },
  { icon: BookOpen,         bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { icon: Users,            bg: "bg-rose-100    dark:bg-rose-900/30",    text: "text-rose-600    dark:text-rose-400"    },
  { icon: Award,            bg: "bg-amber-100   dark:bg-amber-900/30",   text: "text-amber-600   dark:text-amber-400"   },
  { icon: BriefcaseBusiness,bg: "bg-cyan-100    dark:bg-cyan-900/30",    text: "text-cyan-600    dark:text-cyan-400"    },
  { icon: CalendarClock,    bg: "bg-pink-100    dark:bg-pink-900/30",    text: "text-pink-600    dark:text-pink-400"    },
];

function getPalette(index: number) {
  return TEACHER_PALETTE[index % TEACHER_PALETTE.length];
}

const COMPONENT_LABELS = {
  GENERAL: "General",
  THEORY: "Teoría",
  PRACTICE: "Práctica",
} as const;

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

type TeacherFormState = {
  userId: string;
  code: string;
  apellidos: string;
  nombres: string;
  specialty: string;
  isActive: boolean;
  availability: AvailabilitySlot[];
  courseCodes: string[];
  courseComponentIds: string[];
};

const EMPTY_FORM: TeacherFormState = {
  userId: "",
  code: "",
  apellidos: "",
  nombres: "",
  specialty: "",
  isActive: true,
  availability: [],
  courseCodes: [],
  courseComponentIds: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAdmin | null>(null);
  const [form, setForm] = useState<TeacherFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");

  // Confirmations
  const [confirmDeactivate, setConfirmDeactivate] = useState<TeacherAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeacherAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Availability modal
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [coursesModalOpen, setCoursesModalOpen] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<TeacherAdmin | null>(null);
  const [activeTeacherIdx, setActiveTeacherIdx] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadTeachers = useCallback(async (search: string, pg = page) => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchTeachers(search.trim(), pg)
        : await adminApi.listTeachers(pg);
      setTeachers(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      toastError("No se pudieron cargar los docentes", getApiErrorMessage(error, "Intenta nuevamente."));
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

  useEffect(() => { void loadTeachers(query, page); }, [query, page, loadTeachers]);
  useAdminEvents("teachers.changed", () => {
    if (!anyModalOpenRef.current) void loadTeachers(query, page);
  });

  // ─── Derived ──────────────────────────────────────────────────────────────

  const specialties = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.specialty).filter((s): s is string => Boolean(s)))).sort(),
    [teachers],
  );

  const filtered = useMemo(
    () =>
      teachers.filter((t) => {
        if (statusFilter === "active" && !t.isActive) return false;
        if (statusFilter === "inactive" && t.isActive) return false;
        if (specialtyFilter !== "all" && t.specialty !== specialtyFilter) return false;
        return true;
      }),
    [teachers, statusFilter, specialtyFilter],
  );

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (specialtyFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setSpecialtyFilter("all");
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(teacher: TeacherAdmin) {
    const parts = splitFullName(teacher.fullName);
    setEditing(teacher);
    setForm({
      userId: teacher.userId ?? "",
      code: teacher.code,
      apellidos: parts.apellidos,
      nombres: parts.nombres,
      specialty: teacher.specialty,
      isActive: teacher.isActive,
      availability: teacher.availability,
      courseCodes: teacher.courseCodes ?? [],
      courseComponentIds: teacher.courseComponentIds ?? [],
    });
    setErrors({});
    setDialogOpen(true);
  }

  function openAvailabilityModal(teacher: TeacherAdmin, index: number) {
    setActiveTeacher(teacher);
    setActiveTeacherIdx(index);
    setAvailabilityModalOpen(true);
  }

  function openCoursesModal(teacher: TeacherAdmin, index: number) {
    setActiveTeacher(teacher);
    setActiveTeacherIdx(index);
    setCoursesModalOpen(true);
  }

  function onTeacherUpdated(updated: TeacherAdmin) {
    setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTeacher(updated);
  }

  async function handleSubmit() {
    const localErrors: Record<string, string> = {};
    if (!form.apellidos.trim()) localErrors.apellidos = "Los apellidos son obligatorios";
    if (!form.nombres.trim()) localErrors.nombres = "Los nombres son obligatorios";

    const payloadInput = {
      userId: form.userId,
      code: form.code,
      fullName: joinFullName(form.nombres, form.apellidos),
      specialty: form.specialty,
      isActive: form.isActive,
      courseCodes: form.courseCodes,
      courseComponentIds: form.courseComponentIds,
    };

    const result = teacherSchema.safeParse(payloadInput);
    if (!result.success || Object.keys(localErrors).length > 0) {
      const zodErrors = result.success ? {} : flattenErrors(result.error);
      setErrors({ ...zodErrors, ...localErrors });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...result.data,
        userId: result.data.userId || null,
        availability: form.availability,
      };

      if (editing) {
        const updated = await adminApi.updateTeacher(editing.id, payload);
        setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toastSuccess("Docente actualizado");
      } else {
        await adminApi.createTeacher(payload);
        toastSuccess("Docente creado");
        await loadTeachers(query);
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      toastError("No se pudo guardar el docente", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(teacher: TeacherAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateTeacher(teacher.id);
      toastSuccess("Docente desactivado");
      setConfirmDeactivate(null);
      await loadTeachers(query);
    } catch (error) {
      toastError("No se pudo desactivar el docente", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(teacher: TeacherAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteTeacher(teacher.id);
      toastSuccess("Docente eliminado");
      setConfirmDelete(null);
      await loadTeachers(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar el docente",
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Docentes"
      actions={
        <Button onClick={openCreate} className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]">
          <Plus className="h-4 w-4" />
          Nuevo docente
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Especialidad</label>
              <SelectField
                value={specialtyFilter}
                onChange={setSpecialtyFilter}
                options={[
                  { value: "all", label: "Todas" },
                  ...specialties.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
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
          <GraduationCap className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            {query.trim() ? "Sin resultados para esa búsqueda." : "No hay docentes. Crea el primero."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((teacher, idx) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              paletteIndex={idx}
              onAvailability={() => openAvailabilityModal(teacher, idx)}
              onCourses={() => openCoursesModal(teacher, idx)}
              onEdit={() => openEdit(teacher)}
              onDeactivate={() => setConfirmDeactivate(teacher)}
              onDelete={() => setConfirmDelete(teacher)}
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
        teacher={activeTeacher}
        paletteIndex={activeTeacherIdx}
        onUpdated={onTeacherUpdated}
      />

      <TeacherCoursesModal
        open={coursesModalOpen}
        onOpenChange={setCoursesModalOpen}
        teacher={activeTeacher}
        paletteIndex={activeTeacherIdx}
        onUpdated={onTeacherUpdated}
      />

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar docente" : "Nuevo docente"}</DialogTitle>
            <DialogDescription>Configura la identidad académica del docente, su especialidad y sus franjas disponibles.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Ficha del docente</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Código" error={errors.code}>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  />
                </FormField>
                <FormField label="Activo">
                  <SelectField
                    value={String(form.isActive)}
                    onChange={(v) => setForm((p) => ({ ...p, isActive: v === "true" }))}
                    options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombres" error={errors.nombres ?? errors.fullName}>
                  <Input
                    value={form.nombres}
                    onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                    placeholder="Nombres"
                  />
                </FormField>
                <FormField label="Apellidos" error={errors.apellidos}>
                  <Input
                    value={form.apellidos}
                    onChange={(e) => setForm((p) => ({ ...p, apellidos: e.target.value }))}
                    placeholder="Apellido paterno materno"
                  />
                </FormField>
              </div>
              <FormField label="Especialidad" error={errors.specialty}>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                />
              </FormField>
              {editing && (
                <FormField label="Correo institucional">
                  <Input value={editing.email ?? "—"} disabled readOnly />
                </FormField>
              )}
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
        title="Desactivar docente"
        description={`¿Desactivar a "${confirmDeactivate?.fullName}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        variant="warning"
        onConfirm={() => confirmDeactivate && void handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar docente"
        description={`Esta acción es permanente. "${confirmDelete?.fullName}" será eliminado definitivamente. Si tiene registros asociados, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── TeacherCard ──────────────────────────────────────────────────────────────

function TeacherCard({
  teacher,
  paletteIndex,
  onAvailability,
  onCourses,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  teacher: TeacherAdmin;
  paletteIndex: number;
  onAvailability: () => void;
  onCourses: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPalette(paletteIndex);
  const Icon = palette.icon;
  const availabilityCount = teacher.availability.length;
  const courseCount = (teacher.courseCodes ?? []).length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{teacher.fullName}</p>
      </div>

      {/* Data rows */}
      <div className="space-y-1.5 px-4 pb-3">
        <InfoRow icon={<Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />} value={teacher.code} mono />
        <InfoRow icon={<BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-violet-500" />} value={teacher.specialty} />
        <InfoRow
          icon={<CalendarClock className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
          value={`${availabilityCount} ${availabilityCount === 1 ? "franja" : "franjas"}`}
        />
        <InfoRow
          icon={<BookOpen className="h-3.5 w-3.5 shrink-0 text-cyan-500" />}
          value={`${courseCount} ${courseCount === 1 ? "curso asignado" : "cursos asignados"}`}
        />
        {teacher.email && (
          <InfoRow icon={<Mail className="h-3.5 w-3.5 shrink-0 text-emerald-500" />} value={teacher.email} />
        )}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              teacher.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white",
            )}
          >
            {teacher.isActive ? "✓" : "✕"}
          </span>
          <span className={cn("text-xs", teacher.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground")}>
            {teacher.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        {teacher.createdAt && (
          <InfoRow icon={<CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" />} value={`Creado: ${formatDate(teacher.createdAt)}`} />
        )}
        {teacher.updatedAt && teacher.updatedAt !== teacher.createdAt && (
          <InfoRow icon={<RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />} value={`Actualizado: ${formatDate(teacher.updatedAt)}`} />
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

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
          Cursos
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
          disabled={!teacher.isActive}
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

// ─── TeacherCoursesModal ─────────────────────────────────────────────────────

function TeacherCoursesModal({
  open,
  onOpenChange,
  teacher,
  paletteIndex,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teacher: TeacherAdmin | null;
  paletteIndex: number;
  onUpdated: (updated: TeacherAdmin) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<Record<string, CourseAdmin>>({});
  const [searchResults, setSearchResults] = useState<CourseAdmin[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmRemoveCourse, setConfirmRemoveCourse] = useState<CourseAdmin | null>(null);
  // Estado pendiente: curso seleccionado del dropdown, esperando confirmación de componentes
  const [pendingCourse, setPendingCourse] = useState<CourseAdmin | null>(null);
  const [pendingComponentIds, setPendingComponentIds] = useState<string[]>([]);
  // Si estamos editando un curso ya asignado (vs agregar uno nuevo)
  const [pendingIsEdit, setPendingIsEdit] = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());
  const palette = getPalette(paletteIndex);

  const assignedComponentIds = useMemo(() => teacher?.courseComponentIds ?? [], [teacher]);

  // Derivamos los códigos de curso a partir de los componentes asignados y el catálogo local
  const resolvedCourseCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const cid of assignedComponentIds) {
      for (const course of Object.values(resolved)) {
        if (course.components?.some((c) => c.id === cid)) {
          codes.add(course.code);
          break;
        }
      }
    }
    return codes;
  }, [assignedComponentIds, resolved]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setPendingCourse(null);
      setPendingComponentIds([]);
      setPendingIsEdit(false);
    }
  }, [open]);

  const prevTeacherIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && teacher && teacher.id !== prevTeacherIdRef.current) {
      prevTeacherIdRef.current = teacher.id;
      setResolved({});
      attemptedRef.current = new Set();
    }
  }, [open, teacher]);

  // Resuelve los cursos por sus códigos (teacher.courseCodes → findCoursesByCodes)
  useEffect(() => {
    if (!open || !teacher) return;
    const codes = teacher.courseCodes ?? [];
    const missing = codes.filter((code) => !attemptedRef.current.has(code));
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
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [open, teacher]);

  useEffect(() => {
    if (!open || !teacher) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
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
  }, [open, searchQuery, teacher]);

  async function saveComponentIds(nextIds: string[], successMessage: string, errorTitle: string) {
    if (!teacher) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateTeacher(teacher.id, {
        code: teacher.code,
        fullName: teacher.fullName,
        specialty: teacher.specialty,
        isActive: teacher.isActive,
        userId: teacher.userId,
        availability: teacher.availability,
        courseCodes: [],
        courseComponentIds: nextIds,
      });
      onUpdated(updated);
      toastSuccess(successMessage);
    } catch (error) {
      toastError(errorTitle, getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  // Paso 1a: el usuario elige un curso del dropdown → abrir selector de componentes (agregar)
  function handleSelectCourseFromSearch(course: CourseAdmin) {
    const allIds = (course.components ?? []).filter((c) => c.id).map((c) => c.id!);
    setResolved((prev) => ({ ...prev, [course.code]: course }));
    setSearchQuery("");
    setSearchResults([]);
    setPendingCourse(course);
    setPendingComponentIds(allIds);
    setPendingIsEdit(false);
  }

  // Paso 1b: el usuario hace click en el lápiz de una tarjeta → editar componentes
  function handleEditCourse(course: CourseAdmin, currentSelectedIds: string[]) {
    setPendingCourse(course);
    setPendingComponentIds(currentSelectedIds);
    setPendingIsEdit(true);
    setSearchQuery("");
    setSearchResults([]);
  }

  // Paso 2: confirmar adición o edición
  async function handleConfirmPendingCourse() {
    if (!pendingCourse || pendingComponentIds.length === 0) return;
    if (pendingIsEdit) {
      // Reemplaza solo los componentes de este curso
      const courseComponentSet = new Set((pendingCourse.components ?? []).map((c) => c.id));
      const otherIds = assignedComponentIds.filter((id) => !courseComponentSet.has(id));
      await saveComponentIds(
        [...otherIds, ...pendingComponentIds],
        "Tipos de clase actualizados",
        "No se pudo actualizar",
      );
    } else {
      const newIds = pendingComponentIds.filter((id) => !assignedComponentIds.includes(id));
      await saveComponentIds(
        [...assignedComponentIds, ...newIds],
        "Curso asignado",
        "No se pudo asignar el curso",
      );
    }
    setPendingCourse(null);
    setPendingComponentIds([]);
    setPendingIsEdit(false);
  }

  function handleCancelPendingCourse() {
    setPendingCourse(null);
    setPendingComponentIds([]);
    setPendingIsEdit(false);
  }

  function handleTogglePendingComponent(componentId: string) {
    setPendingComponentIds((prev) =>
      prev.includes(componentId) ? prev.filter((id) => id !== componentId) : [...prev, componentId],
    );
  }

  // Quita un curso completo: elimina todos sus componentes del docente
  function handleRemoveCourse(course: CourseAdmin) {
    const courseComponentSet = new Set((course.components ?? []).map((c) => c.id));
    void saveComponentIds(
      assignedComponentIds.filter((id) => !courseComponentSet.has(id)),
      "Curso quitado",
      "No se pudo quitar el curso",
    );
  }

  // Activa o desactiva un componente individual dentro de un curso ya asignado
  function handleToggleComponent(component: CourseComponentAdmin) {
    if (!component.id) return;
    const isSelected = assignedComponentIds.includes(component.id);
    if (isSelected) {
      void saveComponentIds(
        assignedComponentIds.filter((id) => id !== component.id),
        "Tipo de clase quitado",
        "No se pudo quitar el tipo de clase",
      );
    } else {
      void saveComponentIds(
        [...assignedComponentIds, component.id],
        "Tipo de clase asignado",
        "No se pudo asignar el tipo de clase",
      );
    }
  }

  // Agrupa los IDs asignados por curso, usando el catálogo resuelto
  const courseGroups = useMemo(() => {
    const groups: Array<{ course: CourseAdmin; selectedIds: string[] }> = [];
    const seen = new Set<string>();
    for (const cid of assignedComponentIds) {
      for (const course of Object.values(resolved)) {
        if (course.components?.some((c) => c.id === cid)) {
          if (!seen.has(course.id)) {
            seen.add(course.id);
            const selectedIds = assignedComponentIds.filter((id) =>
              course.components?.some((c) => c.id === id),
            );
            groups.push({ course, selectedIds });
          }
          break;
        }
      }
    }
    return groups;
  }, [assignedComponentIds, resolved]);

  // IDs aún no resueltos (el curso no está en caché)
  const unresolvedIds = useMemo(
    () => assignedComponentIds.filter((cid) => !Object.values(resolved).some((c) => c.components?.some((comp) => comp.id === cid))),
    [assignedComponentIds, resolved],
  );

  if (!teacher) return null;

  const totalCourses = courseGroups.length + (unresolvedIds.length > 0 ? 1 : 0);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[42rem]">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle>Cursos asignados · {teacher.fullName}</DialogTitle>
          <DialogDescription>
            Asigna cursos al docente y selecciona qué tipos de clase dicta en cada uno.
          </DialogDescription>
        </DialogHeader>

        {/* Barra de estadísticas */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-2.5">
          <span className={cn("text-xs font-medium", palette.text)}>
            {totalCourses} {totalCourses === 1 ? "curso" : "cursos"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {assignedComponentIds.length} {assignedComponentIds.length === 1 ? "tipo de clase" : "tipos de clase"} seleccionados
          </span>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Buscador de cursos */}
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
                      const alreadyAssigned = resolvedCourseCodes.has(course.code) || pendingCourse?.code === course.code;
                      return (
                        <button
                          key={course.id}
                          type="button"
                          disabled={saving || alreadyAssigned || (course.components ?? []).length === 0}
                          onClick={() => handleSelectCourseFromSearch(course)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-violet-900/30"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{course.code}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{course.name}</span>
                          </div>
                          <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                            {alreadyAssigned ? (
                              <span className="text-violet-500">Ya asignado</span>
                            ) : (
                              `${(course.components ?? []).length} tipo${(course.components ?? []).length !== 1 ? "s" : ""} de clase`
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección pendiente: selección de componentes antes de confirmar */}
          {pendingCourse && (
            <div className="overflow-hidden rounded-xl border-2 border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30">
              <div className="flex items-center justify-between gap-3 border-b border-violet-200 px-4 py-2.5 dark:border-violet-800">
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-400">{pendingIsEdit ? "Editar tipos de clase" : "Nuevo curso"}</span>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {pendingCourse.code}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{pendingCourse.name}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPendingCourse}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-violet-200 hover:text-violet-700 dark:hover:bg-violet-800 dark:hover:text-violet-300"
                  title="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="px-4 pb-4 pt-3">
                <p className="mb-3 text-xs text-muted-foreground">
                  Selecciona los tipos de clase que dicta este docente:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(pendingCourse.components ?? []).map((component) => {
                    const isSelected = component.id ? pendingComponentIds.includes(component.id) : false;
                    return (
                      <button
                        key={component.id ?? component.componentType}
                        type="button"
                        disabled={!component.id}
                        onClick={() => component.id && handleTogglePendingComponent(component.id)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-xl border-2 px-4 py-3 text-left transition",
                          isSelected
                            ? "border-violet-400 bg-violet-100 dark:border-violet-600 dark:bg-violet-900/50"
                            : "border-border bg-card hover:border-violet-200 hover:bg-violet-50 dark:hover:border-violet-800 dark:hover:bg-violet-950/20",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className={cn("text-sm font-semibold", isSelected ? "text-violet-700 dark:text-violet-300" : "text-foreground")}>
                            {COMPONENT_LABELS[component.componentType]}
                          </span>
                          <span className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] font-bold transition",
                            isSelected
                              ? "border-violet-500 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-400"
                              : "border-border bg-background",
                          )}>
                            {isSelected && "✓"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{component.weeklyHours}h/sem · {component.requiredRoomType}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelPendingCourse}
                    className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={saving || pendingComponentIds.length === 0}
                    onClick={() => void handleConfirmPendingCourse()}
                    className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Guardando…" : pendingIsEdit ? "Guardar" : `Agregar${pendingComponentIds.length > 0 ? ` (${pendingComponentIds.length})` : ""}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de cursos asignados agrupados */}
          {totalCourses === 0 ? (
            !searchQuery.trim() && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
                <BookOpen className="h-6 w-6 opacity-40" />
                <p className="text-sm">Este docente no tiene cursos asignados.</p>
                <p className="text-xs opacity-70">Busca un curso arriba para comenzar.</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {/* Cursos resueltos en grilla 2 columnas */}
              <div className="grid grid-cols-2 gap-3">
              {courseGroups.map(({ course, selectedIds }) => (
                <div
                  key={course.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  {/* Encabezado del curso */}
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm text-violet-700 dark:text-violet-400">{course.code}</p>
                      <p className="truncate text-xs text-muted-foreground leading-tight">{course.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleEditCourse(course, selectedIds)}
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-violet-100 hover:text-violet-600 disabled:opacity-50 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
                        title="Editar tipos de clase"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setConfirmRemoveCourse(course)}
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Quitar curso"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chips de componentes (solo lectura, editar con el lápiz) */}
                  <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
                    {(course.components ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin componentes.</p>
                    ) : (
                      (course.components ?? []).map((component) => {
                        const isSelected = component.id ? selectedIds.includes(component.id) : false;
                        if (!isSelected) return null;
                        return (
                          <span
                            key={component.id ?? component.componentType}
                            className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                            {COMPONENT_LABELS[component.componentType]}
                            <span className="opacity-60">{component.weeklyHours}h</span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
              </div>

              {/* IDs de componentes huérfanos (curso no resuelto en caché) */}
              {unresolvedIds.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 dark:border-amber-800/50">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {unresolvedIds.length} componente{unresolvedIds.length !== 1 ? "s" : ""} sin resolver
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {unresolvedIds.map((cid) => (
                      <button
                        key={cid}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void saveComponentIds(
                            assignedComponentIds.filter((id) => id !== cid),
                            "Componente quitado",
                            "No se pudo quitar",
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-mono text-amber-700 transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        title="Quitar componente no encontrado"
                      >
                        {cid.slice(0, 8)}…
                        <X className="h-3 w-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={!!confirmRemoveCourse}
      onOpenChange={(o) => !o && setConfirmRemoveCourse(null)}
      title="Quitar curso"
      description={`¿Quitar "${confirmRemoveCourse?.code} – ${confirmRemoveCourse?.name}" del docente? Se eliminarán todos sus componentes asignados.`}
      confirmLabel="Quitar"
      variant="destructive"
      onConfirm={() => {
        if (confirmRemoveCourse) handleRemoveCourse(confirmRemoveCourse);
        setConfirmRemoveCourse(null);
      }}
      isLoading={saving}
    />
    </>
  );
}

// ─── AvailabilityModal ───────────────────────────────────────────────────────

function AvailabilityModal({
  open,
  onOpenChange,
  teacher,
  paletteIndex,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teacher: TeacherAdmin | null;
  paletteIndex: number;
  onUpdated: (updated: TeacherAdmin) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const palette = getPalette(paletteIndex);

  useEffect(() => {
    if (open && teacher) setAvailability(teacher.availability);
  }, [open, teacher]);

  async function handleSave() {
    if (!teacher) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateTeacher(teacher.id, {
        code: teacher.code,
        fullName: teacher.fullName,
        specialty: teacher.specialty,
        isActive: teacher.isActive,
        userId: teacher.userId,
        availability,
        courseCodes: [],
        courseComponentIds: teacher.courseComponentIds ?? [],
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

  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[42rem]">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle>Disponibilidad · {teacher.fullName}</DialogTitle>
          <DialogDescription>Gestiona las franjas disponibles de este docente.</DialogDescription>
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
