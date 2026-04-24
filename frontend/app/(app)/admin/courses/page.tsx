"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Search,
  X,
  Plus,
  Pencil,
  Power,
  Trash2,
  FlaskConical,
  Globe,
  Cpu,
  GraduationCap,
  Layers,
  Music,
  Stethoscope,
  Scale,
  Tag,
  Clock,
  Star,
  MapPin,
  Wrench,
  Target,
  Microscope,
  ShieldCheck,
  Code2,
  Users,
  Database,
  CalendarDays,
  RefreshCw,
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
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SelectField } from "@/components/admin/SelectField";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { courseSchema } from "@/lib/validators/course.schema";
import { toastError, toastSuccess, cn } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { CourseAdmin } from "@/types/admin";

// ─── Palette ──────────────────────────────────────────────────────────────────

const COURSE_PALETTE = [
  { icon: BookOpen,      bg: "bg-violet-100",  text: "text-violet-600"  },
  { icon: FlaskConical,  bg: "bg-blue-100",    text: "text-blue-600"    },
  { icon: Cpu,           bg: "bg-emerald-100", text: "text-emerald-600" },
  { icon: GraduationCap, bg: "bg-rose-100",    text: "text-rose-600"    },
  { icon: Layers,        bg: "bg-amber-100",   text: "text-amber-600"   },
  { icon: Globe,         bg: "bg-cyan-100",    text: "text-cyan-600"    },
  { icon: Scale,         bg: "bg-pink-100",    text: "text-pink-600"    },
  { icon: Stethoscope,   bg: "bg-indigo-100",  text: "text-indigo-600"  },
  { icon: Music,         bg: "bg-orange-100",  text: "text-orange-600"  },
];

function getPalette(index: number) {
  return COURSE_PALETTE[index % COURSE_PALETTE.length];
}

function getIconForCourseName(name: string): React.ElementType {
  const n = name.toLowerCase();
  if (n.includes("taller"))                                                  return Wrench;
  if (n.includes("seminario") || n.includes("coloquio"))                     return Users;
  if (n.includes("investigaci"))                                             return Microscope;
  if (n.includes("proyecto") || n.includes("direcci"))                      return Target;
  if (n.includes("prueba") || n.includes("calidad") || n.includes("test"))  return ShieldCheck;
  if (n.includes("software") || n.includes("programaci") || n.includes("c\u00f3digo") || n.includes("codigo")) return Code2;
  if (n.includes("base") && (n.includes("dato") || n.includes("data")))    return Database;
  if (n.includes("red") || n.includes("comunicaci"))                        return Globe;
  if (n.includes("matem") || n.includes("c\u00e1lculo") || n.includes("calculo") || n.includes("estad")) return Scale;
  if (n.includes("f\u00edsic") || n.includes("fisic") || n.includes("qu\u00edmic") || n.includes("quimic") || n.includes("laboratorio")) return FlaskConical;
  if (n.includes("ingeni") || n.includes("sistemas"))                       return Cpu;
  if (n.includes("gesti") || n.includes("administra") || n.includes("gerencia")) return Layers;
  if (n.includes("seguridad") || n.includes("ciberseguridad"))              return ShieldCheck;
  if (n.includes("inteligencia") || n.includes("machine") || n.includes("artificial")) return Cpu;
  return BookOpen;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function flattenErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const key = issue.path.join(".");
    if (key && !acc[key]) acc[key] = issue.message;
    return acc;
  }, {});
}

// ─── Form types ───────────────────────────────────────────────────────────────

type CourseFormState = {
  code: string;
  name: string;
  credits: number;
  weeklyHours: number;
  requiredRoomType: string;
  isActive: boolean;
  prerequisites: string[];
};

const EMPTY_FORM: CourseFormState = {
  code: "",
  name: "",
  credits: 3,
  weeklyHours: 4,
  requiredRoomType: "",
  isActive: true,
  prerequisites: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [courses, setCourses]   = useState<CourseAdmin[]>([]);
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<CourseAdmin | null>(null);
  const [form, setForm]             = useState<CourseFormState>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
  const [minCredits, setMinCredits]         = useState<string>("");
  const [maxCredits, setMaxCredits]         = useState<string>("");

  // Confirmations
  const [confirmDeactivate, setConfirmDeactivate] = useState<CourseAdmin | null>(null);
  const [confirmDelete, setConfirmDelete]         = useState<CourseAdmin | null>(null);
  const [actionLoading, setActionLoading]         = useState(false);

  // Prerequisites modal
  const [prereqModalOpen, setPrereqModalOpen]               = useState(false);
  const [activeCoursePrerreq, setActiveCoursePrerreq]       = useState<CourseAdmin | null>(null);
  const [activeCoursePrerreqIdx, setActiveCoursePrerreqIdx] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadCourses = useCallback(async (search: string, pg = page) => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchCourses(search.trim(), pg)
        : await adminApi.listCourses(pg);
      setCourses(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      toastError("No se pudieron cargar los cursos", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  useEffect(() => { void loadCourses(query, page); }, [query, page, loadCourses]);
  useAdminEvents("courses.changed", () => {
    void loadCourses(query, page);
  });

  const roomTypes = useMemo(
    () => Array.from(new Set(courses.map((c) => c.requiredRoomType).filter((v): v is string => !!v))).sort(),
    [courses],
  );

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        if (statusFilter === "active" && !c.isActive) return false;
        if (statusFilter === "inactive" && c.isActive) return false;
        if (roomTypeFilter !== "all" && c.requiredRoomType !== roomTypeFilter) return false;
        if (minCredits.trim() && c.credits < Number(minCredits)) return false;
        if (maxCredits.trim() && c.credits > Number(maxCredits)) return false;
        return true;
      }),
    [courses, statusFilter, roomTypeFilter, minCredits, maxCredits],
  );

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (roomTypeFilter !== "all" ? 1 : 0) +
    (minCredits.trim() ? 1 : 0) +
    (maxCredits.trim() ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setRoomTypeFilter("all");
    setMinCredits("");
    setMaxCredits("");
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(course: CourseAdmin) {
    setEditing(course);
    setForm({
      code: course.code,
      name: course.name,
      credits: course.credits,
      weeklyHours: course.weeklyHours,
      requiredRoomType: course.requiredRoomType ?? "",
      isActive: course.isActive,
      prerequisites: course.prerequisites,
    });
    setErrors({});
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const result = courseSchema.safeParse(form);
    if (!result.success) { setErrors(flattenErrors(result.error)); return; }

    setSubmitting(true);
    try {
      const payload = { ...result.data, requiredRoomType: result.data.requiredRoomType?.trim() || null };
      if (editing) {
        const updated = await adminApi.updateCourse(editing.id, payload);
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toastSuccess("Curso actualizado");
      } else {
        const created = await adminApi.createCourse(payload);
        setCourses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toastSuccess("Curso creado");
      }
      setDialogOpen(false);
    } catch (error) {
      toastError("No se pudo guardar el curso", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(course: CourseAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateCourse(course.id);
      toastSuccess("Curso desactivado");
      setConfirmDeactivate(null);
      await loadCourses(query);
    } catch (error) {
      toastError("No se pudo desactivar el curso", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(course: CourseAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteCourse(course.id);
      toastSuccess("Curso eliminado");
      setConfirmDelete(null);
      await loadCourses(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar el curso",
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  function openPrereqModal(course: CourseAdmin, index: number) {
    setActiveCoursePrerreq(course);
    setActiveCoursePrerreqIdx(index);
    setPrereqModalOpen(true);
  }

  function onPrereqsUpdated(updated: CourseAdmin) {
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActiveCoursePrerreq(updated);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Cursos"
      actions={
        <Button onClick={openCreate} className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]">
          <Plus className="h-4 w-4" />
          Nuevo curso
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
                <label className="block text-sm font-medium text-foreground">Tipo de aula</label>
                <SelectField
                  value={roomTypeFilter}
                  onChange={setRoomTypeFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    ...roomTypes.map((r) => ({ value: r, label: r })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Créditos</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={minCredits}
                    onChange={(e) => setMinCredits(e.target.value)}
                    placeholder="Mín."
                  />
                  <Input
                    type="number"
                    min={0}
                    value={maxCredits}
                    onChange={(e) => setMaxCredits(e.target.value)}
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
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <BookOpen className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            {query.trim() ? "Sin resultados para esa búsqueda." : "No hay cursos. Crea el primero."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, idx) => (
            <CourseCard
              key={course.id}
              course={course}
              paletteIndex={idx}
              onPrerequisitos={() => openPrereqModal(course, idx)}
              onEdit={() => openEdit(course)}
              onDeactivate={() => setConfirmDeactivate(course)}
              onDelete={() => setConfirmDelete(course)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#ebebeb] pt-4 text-sm">
          <span className="text-[#666666]">Página {page} de {totalPages} &mdash; {totalCount} registros</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-[#ebebeb] px-3 py-1 text-xs disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-[#ebebeb] px-3 py-1 text-xs disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Prerequisites Modal ──────────────────────────────── */}
      <PrerequisitesModal
        open={prereqModalOpen}
        onOpenChange={setPrereqModalOpen}
        course={activeCoursePrerreq}
        onUpdated={onPrereqsUpdated}
      />

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar curso" : "Nuevo curso"}</DialogTitle>
            <DialogDescription>Configura los datos base del curso y sus prerrequisitos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Datos del curso</h3>
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
              <FormField label="Nombre" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Créditos" error={errors.credits}>
                  <Input
                    type="number"
                    value={form.credits}
                    onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) }))}
                  />
                </FormField>
                <FormField label="Horas semanales" error={errors.weeklyHours}>
                  <Input
                    type="number"
                    value={form.weeklyHours}
                    onChange={(e) => setForm((p) => ({ ...p, weeklyHours: Number(e.target.value) }))}
                  />
                </FormField>
              </div>
              <FormField label="Tipo de aula requerido" error={errors.requiredRoomType}>
                <Input
                  value={form.requiredRoomType}
                  onChange={(e) => setForm((p) => ({ ...p, requiredRoomType: e.target.value }))}
                />
              </FormField>
            </div>
            <PrerequisitesPicker
              value={form.prerequisites}
              onChange={(prerequisites) => setForm((p) => ({ ...p, prerequisites }))}
              excludeCode={form.code}
              error={errors.prerequisites}
            />
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
        title="Desactivar curso"
        description={`¿Desactivar "${confirmDeactivate?.name}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmDeactivate && void handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar curso"
        description={`Esta acción es permanente. "${confirmDelete?.name}" será eliminado definitivamente. Si tiene ofertas o prerrequisitos asociados, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({
  course,
  paletteIndex,
  onPrerequisitos,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  course: CourseAdmin;
  paletteIndex: number;
  onPrerequisitos: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPalette(paletteIndex);
  const Icon = getIconForCourseName(course.name);
  const prereqCount = course.prerequisites.length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{course.name}</p>
      </div>

      {/* Datos con iconos individuales */}
      <div className="space-y-1.5 px-4 pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="text-xs text-muted-foreground">{course.credits} créditos</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="text-xs text-muted-foreground">{course.weeklyHours} h/sem</span>
        </div>
        {course.requiredRoomType && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
            <span className="text-xs text-muted-foreground">{course.requiredRoomType}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
            course.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white",
          )}>
            {course.isActive ? "✓" : "✕"}
          </span>
          <span className={cn("text-xs", course.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground")}>
            {course.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        {course.createdAt && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            <span className="text-xs text-muted-foreground">Creado: {new Date(course.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
        {course.updatedAt && course.updatedAt !== course.createdAt && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            <span className="text-xs text-muted-foreground">Actualizado: {new Date(course.updatedAt).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

      {/* Ver Prerrequisitos */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onPrerequisitos}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
            palette.bg,
            palette.text,
            "hover:opacity-80",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Ver prerrequisitos
          {prereqCount > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-current ring-opacity-30",
                palette.bg,
                palette.text,
              )}
            >
              {prereqCount}
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
          disabled={!course.isActive}
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

// ─── PrerequisitesModal ───────────────────────────────────────────────────────

function PrerequisitesModal({
  open,
  onOpenChange,
  course,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course: CourseAdmin | null;
  onUpdated: (updated: CourseAdmin) => void;
}) {
  const [searchQuery, setSearchQuery]         = useState("");
  const [saving, setSaving]                   = useState(false);
  const [confirmRemove, setConfirmRemove]     = useState<string | null>(null);
  const [detailCode, setDetailCode]           = useState<string | null>(null);
  const [resolved, setResolved]               = useState<Record<string, CourseAdmin>>({});
  const [searchResults, setSearchResults]     = useState<CourseAdmin[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setConfirmRemove(null);
      setDetailCode(null);
      setSearchResults([]);
      setResolved({});
      attemptedRef.current = new Set();
    }
  }, [open]);

  // Resolve prereq codes via backend lookup-by-codes (once per code, no retries)
  useEffect(() => {
    if (!open || !course) return;
    const missing = course.prerequisites.filter((code) => !attemptedRef.current.has(code));
    if (missing.length === 0) return;
    missing.forEach((code) => attemptedRef.current.add(code));
    let cancelled = false;
    (async () => {
      try {
        const list = await adminApi.findCoursesByCodes(missing);
        if (cancelled) return;
        const next: Record<string, CourseAdmin> = {};
        for (const c of list) next[c.code] = c;
        if (Object.keys(next).length > 0) {
          setResolved((prev) => ({ ...prev, ...next }));
        }
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [open, course]);

  const prereqDetails = useMemo(() => {
    if (!course) return [];
    return course.prerequisites.map((code) => resolved[code] ?? null);
  }, [course, resolved]);

  // Server-side search (debounced) for the "add prerequisite" input
  useEffect(() => {
    if (!open || !course) return;
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
        setSearchResults(
          data.content.filter(
            (c) => !course.prerequisites.includes(c.code) && c.code !== course.code,
          ),
        );
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, open, course]);

  async function handleAdd(newCode: string) {
    if (!course) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateCourse(course.id, {
        code: course.code,
        name: course.name,
        credits: course.credits,
        weeklyHours: course.weeklyHours,
        requiredRoomType: course.requiredRoomType,
        isActive: course.isActive,
        prerequisites: [...course.prerequisites, newCode],
      });
      onUpdated(updated);
      setSearchQuery("");
      toastSuccess("Prerrequisito agregado");
    } catch (error) {
      toastError("No se pudo agregar el prerrequisito", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(code: string) {
    if (!course) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateCourse(course.id, {
        code: course.code,
        name: course.name,
        credits: course.credits,
        weeklyHours: course.weeklyHours,
        requiredRoomType: course.requiredRoomType,
        isActive: course.isActive,
        prerequisites: course.prerequisites.filter((p) => p !== code),
      });
      onUpdated(updated);
      setConfirmRemove(null);
      toastSuccess("Prerrequisito eliminado");
    } catch (error) {
      toastError("No se pudo eliminar el prerrequisito", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  if (!course) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[52rem]">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <DialogTitle>Prerrequisitos · {course.name}</DialogTitle>
            <DialogDescription>Gestiona los prerrequisitos de este curso.</DialogDescription>
          </DialogHeader>

          {/* Count bar */}
          <div className="flex items-center border-b border-border bg-muted/30 px-6 py-3">
            <span className="text-xs text-muted-foreground">
              {course.prerequisites.length}{" "}
              {course.prerequisites.length === 1 ? "prerrequisito" : "prerrequisitos"}
            </span>
          </div>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
            {/* Search to add */}
            <div className="space-y-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar curso por código o nombre para agregar…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* Inline results */}
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
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={saving}
                          onClick={() => void handleAdd(c.code)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <Plus className="h-3.5 w-3.5 shrink-0 text-[#6B21A8]" />
                            <div>
                              <span className="font-medium text-foreground">{c.code}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{c.name}</span>
                            </div>
                          </div>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {c.credits} cr · {c.weeklyHours}h/sem
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current prerequisites */}
            {prereqDetails.length === 0 ? (
              !searchQuery.trim() && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
                  <BookOpen className="h-6 w-6 opacity-40" />
                  <p className="text-sm">Este curso no tiene prerrequisitos.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {course.prerequisites.map((code, i) => {
                  const c = prereqDetails[i];
                  return (
                    <div
                      key={code}
                      className="flex flex-col gap-1.5 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800/50 dark:bg-violet-950/30"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight text-[#6B21A8]">{code}</p>
                          {c && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.name}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {c && (
                            <button
                              type="button"
                              onClick={() => setDetailCode(code)}
                              className="rounded-md p-1 text-muted-foreground transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
                              title="Ver detalles"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setConfirmRemove(code)}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                            title="Quitar prerrequisito"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {c ? (
                        <p className="text-xs text-muted-foreground">
                          {c.credits} cr · {c.weeklyHours}h/sem
                          {c.requiredRoomType ? ` · ${c.requiredRoomType}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500">Código no encontrado en catálogo</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Quitar prerrequisito"
        description={`¿Quitar "${confirmRemove}" de los prerrequisitos de "${course.name}"?`}
        confirmLabel="Quitar"
        variant="destructive"
        onConfirm={() => confirmRemove && void handleRemove(confirmRemove)}
        isLoading={saving}
        zIndex={60}
      />
      <PrereqDetailModal
        course={detailCode ? resolved[detailCode] ?? null : null}
        onClose={() => setDetailCode(null)}
      />
    </>
  );
}

// ─── PrerequisitesPicker (para formulario crear/editar) ───────────────────────

function PrerequisitesPicker({
  value,
  onChange,
  excludeCode,
  error,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  excludeCode: string;
  error?: string;
}) {
  const [query, setQuery]             = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [inputRect, setInputRect]     = useState<DOMRect | null>(null);
  const [detailCode, setDetailCode]   = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [resolved, setResolved]       = useState<Record<string, CourseAdmin>>({});
  const [results, setResults]         = useState<CourseAdmin[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const attemptedRef  = useRef<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Server-side search (debounced) for the dropdown
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await adminApi.searchCourses(q, 1, 8);
        if (cancelled) return;
        setResults(
          data.content.filter(
            (c) => !value.includes(c.code) && c.code !== excludeCode,
          ),
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, value, excludeCode]);

  // Resolve currently-selected codes via backend lookup (once per code, no retries)
  useEffect(() => {
    const missing = value.filter((code) => !attemptedRef.current.has(code));
    if (missing.length === 0) return;
    missing.forEach((code) => attemptedRef.current.add(code));
    let cancelled = false;
    (async () => {
      try {
        const list = await adminApi.findCoursesByCodes(missing);
        if (cancelled) return;
        const next: Record<string, CourseAdmin> = {};
        for (const c of list) next[c.code] = c;
        if (Object.keys(next).length > 0) {
          setResolved((prev) => ({ ...prev, ...next }));
        }
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [value]);

  const prereqDetails = useMemo(
    () => value.map((code) => resolved[code] ?? null),
    [value, resolved],
  );

  const dropdownPortal =
    mounted && dropdownOpen && query.trim().length > 0 && inputRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: inputRect.bottom + 4,
              left: inputRect.left,
              width: inputRect.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-input bg-popover shadow-2xl"
          >
            {searchLoading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {results.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      onChange([...value, course.code]);
                      setQuery("");
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-violet-100 dark:hover:bg-violet-900/30"
                  >
                    <span className="font-medium text-foreground">{course.code}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{course.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  const detailCourse = detailCode ? resolved[detailCode] ?? null : null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Prerrequisitos</h3>
      <div ref={containerRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar curso por código o nombre…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (containerRef.current) setInputRect(containerRef.current.getBoundingClientRect());
            setDropdownOpen(true);
          }}
          onFocus={() => {
            if (query.trim() && containerRef.current) {
              setInputRect(containerRef.current.getBoundingClientRect());
              setDropdownOpen(true);
            }
          }}
          autoComplete="off"
        />
      </div>

      {dropdownPortal}

      {prereqDetails.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prerrequisitos ({prereqDetails.length})
          </p>
          <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {value.map((code, i) => {
              const course = prereqDetails[i];
              return (
                <div
                  key={code}
                  className="flex flex-col gap-1.5 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-800/50 dark:bg-violet-950/30"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight text-[#6B21A8]">{code}</p>
                      {course && (
                        <p className="truncate text-xs text-muted-foreground">{course.name}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {course && (
                        <button
                          type="button"
                          onClick={() => setDetailCode(code)}
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
                          title="Ver detalles"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(code)}
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-red-100 hover:text-red-600"
                        title="Quitar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {course && (
                    <p className="text-xs text-muted-foreground">
                      {course.credits} cr · {course.weeklyHours}h/sem
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prereqDetails.length === 0 && !query.trim() && (
        <p className="text-xs text-muted-foreground">Ningún prerrequisito registrado.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <PrereqDetailModal course={detailCourse} onClose={() => setDetailCode(null)} />
      <ConfirmRemovePrereqModal
        code={confirmRemove}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) {
            onChange(value.filter((c) => c !== confirmRemove));
            setConfirmRemove(null);
          }
        }}
      />
    </div>
  );
}

// ─── PrereqDetailModal ────────────────────────────────────────────────────────

function PrereqDetailModal({ course, onClose }: { course: CourseAdmin | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!course) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [course, onClose]);

  if (!mounted || !course) return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 115 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-xl border border-border"
        style={{ zIndex: 120 }}
        role="dialog"
        aria-modal
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Detalles del curso</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <PrereqRow label="Código"          value={course.code} />
          <PrereqRow label="Nombre"          value={course.name} />
          <PrereqRow label="Créditos"        value={String(course.credits)} />
          <PrereqRow label="Horas semanales" value={String(course.weeklyHours)} />
          <PrereqRow label="Tipo de aula"    value={course.requiredRoomType ?? "—"} />
          <PrereqRow label="Estado"          value={course.isActive ? "Activo" : "Inactivo"} />
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── ConfirmRemovePrereqModal ─────────────────────────────────────────────────

function ConfirmRemovePrereqModal({
  code,
  onCancel,
  onConfirm,
}: {
  code: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!code) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [code, onCancel]);

  if (!mounted || !code) return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 125 }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl border border-border"
        style={{ zIndex: 130 }}
        role="alertdialog"
        aria-modal
      >
        <h2 className="mb-2 text-[17px] font-semibold text-foreground">Quitar prerrequisito</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          ¿Quitar <strong>{code}</strong> de los prerrequisitos?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Sí, quitar
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── PrereqRow ────────────────────────────────────────────────────────────────

function PrereqRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
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
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "neutral" | "warning" | "danger";
  className?: string;
}) {
  const variantClass = {
    neutral: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    warning: "text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-40 disabled:cursor-not-allowed",
    danger:  "text-red-600 hover:bg-red-500/10 hover:text-red-500",
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
