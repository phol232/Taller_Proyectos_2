"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap,
  Search,
  X,
  Plus,
  Pencil,
  Power,
  Trash2,
  BookOpen,
  User,
  Tag,
  Hash,
  Star,
  CalendarDays,
  RefreshCw,
  Users,
  BookMarked,
  Award,
  ClipboardList,
  Target,
  Layers,
  BadgeCheck,
  Building2,
  Mail,
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
import { ApprovedCoursePicker } from "@/components/admin/ApprovedCoursePicker";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { studentSchema } from "@/lib/validators/student.schema";
import { toastError, toastSuccess, cn } from "@/lib/utils";
import { joinFullName, splitFullName } from "@/lib/fullName";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { CarreraAdmin, CourseAdmin, FacultadAdmin, StudentAdmin } from "@/types/admin";

// ─── Palette ──────────────────────────────────────────────────────────────────

const STUDENT_PALETTE = [
  { icon: GraduationCap, bg: "bg-violet-100  dark:bg-violet-900/30",  text: "text-violet-600  dark:text-violet-400"  },
  { icon: User,          bg: "bg-blue-100    dark:bg-blue-900/30",    text: "text-blue-600    dark:text-blue-400"    },
  { icon: BookOpen,      bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { icon: Users,         bg: "bg-rose-100    dark:bg-rose-900/30",    text: "text-rose-600    dark:text-rose-400"    },
  { icon: Award,         bg: "bg-amber-100   dark:bg-amber-900/30",   text: "text-amber-600   dark:text-amber-400"   },
  { icon: BookMarked,    bg: "bg-cyan-100    dark:bg-cyan-900/30",    text: "text-cyan-600    dark:text-cyan-400"    },
  { icon: Target,        bg: "bg-pink-100    dark:bg-pink-900/30",    text: "text-pink-600    dark:text-pink-400"    },
  { icon: Layers,        bg: "bg-indigo-100  dark:bg-indigo-900/30",  text: "text-indigo-600  dark:text-indigo-400"  },
  { icon: ClipboardList, bg: "bg-orange-100  dark:bg-orange-900/30",  text: "text-orange-600  dark:text-orange-400"  },
];

function getPalette(index: number) {
  return STUDENT_PALETTE[index % STUDENT_PALETTE.length];
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

type StudentFormState = {
  userId: string;
  code: string;
  email: string;
  apellidos: string;
  nombres: string;
  cycle: number;
  facultadId: string;
  carreraId: string;
  creditLimit: number;
  isActive: boolean;
  approvedCourses: string[];
};

const EMPTY_FORM: StudentFormState = {
  userId: "",
  code: "",
  email: "",
  apellidos: "",
  nombres: "",
  cycle: 1,
  facultadId: "",
  carreraId: "",
  creditLimit: 22,
  isActive: true,
  approvedCourses: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentAdmin[]>([]);
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<StudentAdmin | null>(null);
  const [form, setForm]             = useState<StudentFormState>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [careerFilter, setCareerFilter]   = useState<string>("all");
  const [cycleFilter, setCycleFilter]     = useState<string>("");

  // Confirmations
  const [confirmDeactivate, setConfirmDeactivate] = useState<StudentAdmin | null>(null);
  const [confirmDelete, setConfirmDelete]         = useState<StudentAdmin | null>(null);
  const [actionLoading, setActionLoading]         = useState(false);

  // Approved courses modal
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [activeStudent, setActiveStudent]         = useState<StudentAdmin | null>(null);

  // Facultades / Carreras for form
  const [facultades, setFacultades]         = useState<FacultadAdmin[]>([]);
  const [allCarreras, setAllCarreras]       = useState<CarreraAdmin[]>([]);
  const [carreras, setCarreras]             = useState<CarreraAdmin[]>([]);
  const [carrerasLoading, setCarrerasLoading] = useState(false);

  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadStudents = useCallback(async (search: string, pg = page) => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchStudents(search.trim(), pg)
        : await adminApi.listStudents(pg);
      setStudents(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      toastError("No se pudieron cargar los estudiantes", getApiErrorMessage(error, "Intenta nuevamente."));
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
    anyModalOpenRef.current = approvedModalOpen || dialogOpen;
  }, [approvedModalOpen, dialogOpen]);

  useEffect(() => { void loadStudents(query, page); }, [query, page, loadStudents]);
  useAdminEvents("students.changed", () => {
    if (!anyModalOpenRef.current) void loadStudents(query, page);
  });

  useEffect(() => {
    adminApi.listCatalogFacultades().then(setFacultades).catch(() => {});
    adminApi.listCatalogCarreras().then(setAllCarreras).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.facultadId) { setCarreras([]); return; }
    setCarrerasLoading(true);
    adminApi.listCatalogCarreras(form.facultadId)
      .then(setCarreras)
      .catch(() => setCarreras([]))
      .finally(() => setCarrerasLoading(false));
  }, [form.facultadId]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const careers = useMemo(
    () => Array.from(new Set(students.map((s) => s.career).filter((c): c is string => Boolean(c)))).sort(),
    [students],
  );
  const facultadNameById = useMemo(
    () => Object.fromEntries(facultades.map((f) => [f.id, f.name])),
    [facultades],
  );
  const carreraNameById = useMemo(
    () => Object.fromEntries(allCarreras.map((c) => [c.id, c.name])),
    [allCarreras],
  );

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        if (statusFilter === "active" && !s.isActive) return false;
        if (statusFilter === "inactive" && s.isActive) return false;
        if (careerFilter !== "all" && s.career !== careerFilter) return false;
        if (cycleFilter.trim() && s.cycle !== Number(cycleFilter)) return false;
        return true;
      }),
    [students, statusFilter, careerFilter, cycleFilter],
  );

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (careerFilter !== "all" ? 1 : 0) +
    (cycleFilter.trim() ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setCareerFilter("all");
    setCycleFilter("");
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(student: StudentAdmin) {
    const parts = splitFullName(student.fullName);
    setEditing(student);
    setForm({
      userId: student.userId ?? "",
      code: student.code,
      email: student.email ?? "",
      apellidos: parts.apellidos,
      nombres: parts.nombres,
      cycle: student.cycle,
      facultadId: student.facultadId ?? "",
      carreraId: student.carreraId ?? "",
      creditLimit: student.creditLimit,
      isActive: student.isActive,
      approvedCourses: student.approvedCourses,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function openApprovedModal(student: StudentAdmin) {
    setActiveStudent(student);
    setApprovedModalOpen(true);
  }

  function onApprovedCoursesUpdated(updated: StudentAdmin) {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveStudent(updated);
  }

  async function handleSubmit() {
    const localErrors: Record<string, string> = {};
    if (!form.apellidos.trim()) localErrors.apellidos = "Los apellidos son obligatorios";
    if (!form.nombres.trim()) localErrors.nombres = "Los nombres son obligatorios";

    const payloadInput = {
      userId: form.userId,
      code: form.code,
      fullName: joinFullName(form.nombres, form.apellidos),
      cycle: form.cycle,
      career: "",
      facultadId: form.facultadId,
      carreraId: form.carreraId,
      creditLimit: form.creditLimit,
      isActive: form.isActive,
      approvedCourses: form.approvedCourses,
    };

    const result = studentSchema.safeParse(payloadInput);
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
        career: null,
        facultadId: form.facultadId || null,
        carreraId: form.carreraId || null,
      };
      if (editing) {
        const updated = await adminApi.updateStudent(editing.id, payload);
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toastSuccess("Estudiante actualizado");
      } else {
        await adminApi.createStudent(payload);
        toastSuccess("Estudiante creado");
        await loadStudents(query);
      }
      setDialogOpen(false);
    } catch (error) {
      toastError("No se pudo guardar el estudiante", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(student: StudentAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateStudent(student.id);
      toastSuccess("Estudiante desactivado");
      setConfirmDeactivate(null);
      await loadStudents(query);
    } catch (error) {
      toastError("No se pudo desactivar el estudiante", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(student: StudentAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteStudent(student.id);
      toastSuccess("Estudiante eliminado");
      setConfirmDelete(null);
      await loadStudents(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar el estudiante",
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Estudiantes"
      actions={
        <Button onClick={openCreate} className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]">
          <Plus className="h-4 w-4" />
          Nuevo estudiante
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
                <label className="block text-sm font-medium text-foreground">Carrera</label>
                <SelectField
                  value={careerFilter}
                  onChange={setCareerFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    ...careers.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Ciclo</label>
                <Input
                  type="number"
                  min={1}
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  placeholder="Ej. 3"
                />
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
          <GraduationCap className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            {query.trim() ? "Sin resultados para esa búsqueda." : "No hay estudiantes. Crea el primero."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student, idx) => (
            <StudentCard
              key={student.id}
              student={student}
              facultadName={student.facultadId ? (facultadNameById[student.facultadId] ?? "—") : "—"}
              carreraName={student.carreraId ? (carreraNameById[student.carreraId] ?? "—") : "—"}
              institutionalEmail={student.email ?? "—"}
              paletteIndex={idx}
              onApprovedCourses={() => openApprovedModal(student)}
              onEdit={() => openEdit(student)}
              onDeactivate={() => setConfirmDeactivate(student)}
              onDelete={() => setConfirmDelete(student)}
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

      {/* ── Approved Courses Modal ───────────────────────────── */}
      <ApprovedCoursesModal
        open={approvedModalOpen}
        onOpenChange={setApprovedModalOpen}
        student={activeStudent}
        onUpdated={onApprovedCoursesUpdated}
      />

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar estudiante" : "Nuevo estudiante"}</DialogTitle>
            <DialogDescription>Configura la ficha académica, la carrera y los cursos aprobados del estudiante.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: academic data */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Ficha académica</h3>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ciclo" error={errors.cycle}>
                  <Input
                    type="number"
                    value={form.cycle}
                    onChange={(e) => setForm((p) => ({ ...p, cycle: Number(e.target.value) }))}
                  />
                </FormField>
                <FormField label="Límite créditos" error={errors.creditLimit}>
                  <Input
                    type="number"
                    value={form.creditLimit}
                    onChange={(e) => setForm((p) => ({ ...p, creditLimit: Number(e.target.value) }))}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Facultad" error={errors.facultadId}>
                  <SelectField
                    value={form.facultadId}
                    onChange={(v) => setForm((p) => ({ ...p, facultadId: v, carreraId: "" }))}
                    options={[
                      { value: "", label: "— Facultad —" },
                      ...facultades.map((f) => ({ value: f.id, label: f.name })),
                    ]}
                  />
                </FormField>
                <FormField label="Carrera" error={errors.carreraId}>
                  <SelectField
                    value={form.carreraId}
                    onChange={(v) => setForm((p) => ({ ...p, carreraId: v }))}
                    options={[
                      {
                        value: "",
                        label: !form.facultadId
                          ? "Selecciona una facultad"
                          : carrerasLoading
                            ? "Cargando…"
                            : "— Carrera —",
                      },
                      ...carreras.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </FormField>
              </div>
              {editing && (
                <FormField label="Correo institucional">
                  <Input value={form.email || "—"} disabled readOnly />
                </FormField>
              )}
            </div>

            {/* Right: approved courses */}
            <div className="space-y-4">
              <ApprovedCoursePicker
                value={form.approvedCourses}
                onChange={(approvedCourses) => setForm((p) => ({ ...p, approvedCourses }))}
                error={errors.approvedCourses}
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
        title="Desactivar estudiante"
        description={`¿Desactivar a "${confirmDeactivate?.fullName}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        variant="warning"
        onConfirm={() => confirmDeactivate && void handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar estudiante"
        description={`Esta acción es permanente. "${confirmDelete?.fullName}" será eliminado definitivamente. Si tiene registros asociados, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── StudentCard ──────────────────────────────────────────────────────────────

function StudentCard({
  student,
  facultadName,
  carreraName,
  institutionalEmail,
  paletteIndex,
  onApprovedCourses,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  student: StudentAdmin;
  facultadName: string;
  carreraName: string;
  institutionalEmail: string;
  paletteIndex: number;
  onApprovedCourses: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getPalette(paletteIndex);
  const Icon = palette.icon;
  const approvedCount = student.approvedCourses.length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-card-foreground">{student.fullName}</p>
          {institutionalEmail && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              {institutionalEmail}
            </p>
          )}
        </div>
      </div>

      {/* Data rows */}
      <div className="space-y-1.5 px-4 pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="font-mono text-xs text-muted-foreground">{student.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="text-xs text-muted-foreground">Ciclo {student.cycle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="text-xs text-muted-foreground">{student.creditLimit} créditos máx.</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              student.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white",
            )}
          >
            {student.isActive ? "✓" : "✕"}
          </span>
          <span className={cn("text-xs", student.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground")}>
            {student.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
          <span className="text-xs text-muted-foreground">Facultad: {facultadName}</span>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Carrera: {carreraName}</span>
        </div>
        {student.createdAt && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            <span className="text-xs text-muted-foreground">
              Creado:{" "}
              {new Date(student.createdAt).toLocaleString("es-PE", {
                timeZone: "America/Lima",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {student.updatedAt && student.updatedAt !== student.createdAt && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            <span className="text-xs text-muted-foreground">
              Actualizado:{" "}
              {new Date(student.updatedAt).toLocaleString("es-PE", {
                timeZone: "America/Lima",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

      {/* Cursos Aprobados button */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onApprovedCourses}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
            palette.bg,
            palette.text,
            "hover:opacity-80",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Cursos aprobados
          {approvedCount > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-current ring-opacity-30",
                palette.bg,
                palette.text,
              )}
            >
              {approvedCount}
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
          disabled={!student.isActive}
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

// ─── ApprovedCoursesModal ─────────────────────────────────────────────────────

function ApprovedCoursesModal({
  open,
  onOpenChange,
  student,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  student: StudentAdmin | null;
  onUpdated: (updated: StudentAdmin) => void;
}) {
  const [searchQuery, setSearchQuery]     = useState("");
  const [saving, setSaving]               = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [detailCode, setDetailCode]       = useState<string | null>(null);
  const [resolved, setResolved]           = useState<Record<string, CourseAdmin>>({});
  const [searchResults, setSearchResults] = useState<CourseAdmin[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setConfirmRemove(null);
      setDetailCode(null);
      setSearchResults([]);
    }
  }, [open]);

  // Reset resolved cache when a different student opens
  const prevStudentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && student && student.id !== prevStudentIdRef.current) {
      prevStudentIdRef.current = student.id;
      setResolved({});
      attemptedRef.current = new Set();
    }
  }, [open, student]);

  // Resolve approved course codes via backend lookup (once per code)
  useEffect(() => {
    if (!open || !student) return;
    const missing = student.approvedCourses.filter((code) => !attemptedRef.current.has(code));
    if (missing.length === 0) return;
    missing.forEach((code) => attemptedRef.current.add(code));
    let cancelled = false;
    (async () => {
      try {
        const list = await adminApi.findCoursesByCodes(missing);
        if (cancelled) return;
        const next: Record<string, CourseAdmin> = {};
        for (const c of list) next[c.code] = c;
        if (Object.keys(next).length > 0) setResolved((prev) => ({ ...prev, ...next }));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [open, student]);

  // Debounced server-side search for adding courses
  useEffect(() => {
    if (!open || !student) return;
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
        setSearchResults(data.content.filter((c) => !student.approvedCourses.includes(c.code)));
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, open, student]);

  const approvedDetails = useMemo(() => {
    if (!student) return [];
    return student.approvedCourses.map((code) => resolved[code] ?? null);
  }, [student, resolved]);

  async function handleAdd(course: CourseAdmin) {
    if (!student) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateStudent(student.id, {
        code: student.code,
        fullName: student.fullName,
        cycle: student.cycle,
        career: student.career,
        facultadId: student.facultadId,
        carreraId: student.carreraId,
        creditLimit: student.creditLimit,
        isActive: student.isActive,
        userId: student.userId,
        approvedCourses: [...student.approvedCourses, course.code],
      });
      attemptedRef.current.add(course.code);
      setResolved((prev) => ({ ...prev, [course.code]: course }));
      onUpdated(updated);
      setSearchQuery("");
      toastSuccess("Curso aprobado agregado");
    } catch (error) {
      toastError("No se pudo agregar el curso", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(code: string) {
    if (!student) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateStudent(student.id, {
        code: student.code,
        fullName: student.fullName,
        cycle: student.cycle,
        career: student.career,
        facultadId: student.facultadId,
        carreraId: student.carreraId,
        creditLimit: student.creditLimit,
        isActive: student.isActive,
        userId: student.userId,
        approvedCourses: student.approvedCourses.filter((c) => c !== code),
      });
      onUpdated(updated);
      setConfirmRemove(null);
      toastSuccess("Curso aprobado eliminado");
    } catch (error) {
      toastError("No se pudo eliminar el curso", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[38rem]">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <DialogTitle>Cursos aprobados · {student.fullName}</DialogTitle>
            <DialogDescription>Gestiona los cursos aprobados de este estudiante.</DialogDescription>
          </DialogHeader>

          {/* Count bar */}
          <div className="flex items-center border-b border-border bg-muted/30 px-6 py-3">
            <span className="text-xs text-muted-foreground">
              {student.approvedCourses.length}{" "}
              {student.approvedCourses.length === 1 ? "curso aprobado" : "cursos aprobados"}
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
                          onClick={() => void handleAdd(c)}
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
                            Ciclo {c.cycle ?? 1} · {c.credits} cr · {c.weeklyHours}h/sem
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current approved courses */}
            {approvedDetails.length === 0 ? (
              !searchQuery.trim() && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
                  <BadgeCheck className="h-6 w-6 opacity-40" />
                  <p className="text-sm">Este estudiante no tiene cursos aprobados.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {student.approvedCourses.map((code, i) => {
                  const c = approvedDetails[i];
                  return (
                    <div
                      key={code}
                      className="flex flex-col gap-1.5 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800/50 dark:bg-violet-950/30"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight text-violet-600 dark:text-violet-400">{code}</p>
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
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50"
                            title="Quitar curso aprobado"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {c ? (
                        <p className="text-xs text-muted-foreground">
                          Ciclo {c.cycle ?? 1} · {c.credits} cr · {c.weeklyHours}h/sem
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
        title="Quitar curso aprobado"
        description={`¿Quitar "${confirmRemove}" de los cursos aprobados de "${student.fullName}"?`}
        confirmLabel="Quitar"
        variant="destructive"
        onConfirm={() => confirmRemove && void handleRemove(confirmRemove)}
        isLoading={saving}
        zIndex={60}
      />
      <ApprovedDetailModal
        course={detailCode ? resolved[detailCode] ?? null : null}
        onClose={() => setDetailCode(null)}
      />
    </>
  );
}

// ─── ApprovedDetailModal ──────────────────────────────────────────────────────

function ApprovedDetailModal({ course, onClose }: { course: CourseAdmin | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);
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
          <DetailRow label="Código"          value={course.code} />
          <DetailRow label="Nombre"          value={course.name} />
          <DetailRow label="Ciclo"           value={String(course.cycle ?? 1)} />
          <DetailRow label="Créditos"        value={String(course.credits)} />
          <DetailRow label="Horas semanales" value={String(course.weeklyHours)} />
          <DetailRow label="Tipo de aula"    value={course.requiredRoomType ?? "—"} />
          <DetailRow label="Estado"          value={course.isActive ? "Activo" : "Inactivo"} />
        </div>
      </div>
    </>,
    document.body,
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
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
