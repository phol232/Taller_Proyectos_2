"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { courseSchema } from "@/lib/validators/course.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { CourseAdmin } from "@/types/admin";

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

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseAdmin | null>(null);
  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
  const [minCredits, setMinCredits] = useState<string>("");
  const [maxCredits, setMaxCredits] = useState<string>("");

  const [confirmDeactivate, setConfirmDeactivate] = useState<CourseAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CourseAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadCourses(query);
  }, [query]);

  useAdminEvents("courses.changed", () => void loadCourses(query));

  async function loadCourses(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchCourses(search.trim())
        : await adminApi.listCourses();
      setCourses(data);
    } catch (error) {
      toastError("No se pudieron cargar los cursos", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  const roomTypes = useMemo(
    () => Array.from(new Set(courses.map((c) => c.requiredRoomType).filter((v): v is string => !!v))).sort(),
    [courses]
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
    [courses, statusFilter, roomTypeFilter, minCredits, maxCredits]
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
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...result.data,
        requiredRoomType: result.data.requiredRoomType?.trim() || null,
      };

      if (editing) {
        await adminApi.updateCourse(editing.id, payload);
        toastSuccess("Curso actualizado");
      } else {
        await adminApi.createCourse(payload);
        toastSuccess("Curso creado");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await loadCourses(query);
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
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <CrudPageLayout
        title="Cursos"
        description="Gestiona el catálogo de cursos, créditos, horas y prerrequisitos."
        data={filtered}
        getRowId={(course) => course.id}
        isLoading={loading}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar..."
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        dialogTitle={editing ? "Editar curso" : "Nuevo curso"}
        dialogDescription="Configura los datos base del curso y sus prerrequisitos."
        onCreate={openCreate}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        filters={
          <FiltersPopover
            activeCount={activeFiltersCount}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onClear={clearFilters}
            extraFilters={
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717]">Tipo de aula</label>
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
                  <label className="block text-sm font-medium text-[#171717]">Créditos</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={minCredits}
                      onChange={(event) => setMinCredits(event.target.value)}
                      placeholder="Mín."
                    />
                    <Input
                      type="number"
                      min={0}
                      value={maxCredits}
                      onChange={(event) => setMaxCredits(event.target.value)}
                      placeholder="Máx."
                    />
                  </div>
                </div>
              </>
            }
          />
        }
        columns={[
          { key: "code", label: "Código", sortable: true, sortAccessor: (c) => c.code, render: (c) => c.code },
          { key: "name", label: "Nombre", sortable: true, sortAccessor: (c) => c.name, render: (c) => c.name },
          { key: "credits", label: "Créditos", sortable: true, sortAccessor: (c) => c.credits, render: (c) => c.credits },
          { key: "hours", label: "Horas", sortable: true, sortAccessor: (c) => c.weeklyHours, render: (c) => c.weeklyHours },
          {
            key: "prerequisites",
            label: "Prerrequisitos",
            render: (course) => (course.prerequisites.length ? course.prerequisites.join(", ") : "—"),
          },
          {
            key: "status",
            label: "Estado",
            sortable: true,
            sortAccessor: (c) => (c.isActive ? 1 : 0),
            render: (c) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {c.isActive ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (course) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(course)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(course)}>
                  Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(course)}>
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Datos del curso</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Código" error={errors.code}>
                <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
              </FormField>
              <FormField label="Activo">
                <SelectField
                  value={String(form.isActive)}
                  onChange={(v) => setForm((prev) => ({ ...prev, isActive: v === "true" }))}
                  options={[
                    { value: "true", label: "Sí" },
                    { value: "false", label: "No" },
                  ]}
                />
              </FormField>
            </div>
            <FormField label="Nombre" error={errors.name}>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Créditos" error={errors.credits}>
                <Input type="number" value={form.credits} onChange={(event) => setForm((prev) => ({ ...prev, credits: Number(event.target.value) }))} />
              </FormField>
              <FormField label="Horas semanales" error={errors.weeklyHours}>
                <Input type="number" value={form.weeklyHours} onChange={(event) => setForm((prev) => ({ ...prev, weeklyHours: Number(event.target.value) }))} />
              </FormField>
            </div>
            <FormField label="Tipo de aula requerido" error={errors.requiredRoomType}>
              <Input value={form.requiredRoomType} onChange={(event) => setForm((prev) => ({ ...prev, requiredRoomType: event.target.value }))} />
            </FormField>
          </div>

          <PrerequisitesPicker
            value={form.prerequisites}
            onChange={(prerequisites) => setForm((prev) => ({ ...prev, prerequisites }))}
            allCourses={courses}
            excludeCode={form.code}
            error={errors.prerequisites}
          />
        </div>
      </CrudPageLayout>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desactivar curso"
        description={`¿Desactivar "${confirmDeactivate?.name}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar curso"
        description={`Esta acción es permanente. "${confirmDelete?.name}" será eliminado definitivamente. Si tiene ofertas o prerrequisitos asociados, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function PrerequisitesPicker({
  value,
  onChange,
  allCourses,
  excludeCode,
  error,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  allCourses: CourseAdmin[];
  excludeCode: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allCourses
      .filter((c) =>
        (c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) &&
        !value.includes(c.code) &&
        c.code !== excludeCode
      )
      .slice(0, 8);
  }, [query, allCourses, value, excludeCode]);

  const prereqDetails = useMemo(
    () => value.map((code) => allCourses.find((c) => c.code === code) ?? null),
    [value, allCourses]
  );

  const dropdownPortal =
    mounted && dropdownOpen && query.trim().length > 0 && inputRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: inputRect.bottom + 4, left: inputRect.left, width: inputRect.width, zIndex: 9999 }}
            className="rounded-xl border border-input bg-white shadow-2xl overflow-hidden"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {results.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => { onChange([...value, course.code]); setQuery(""); setDropdownOpen(false); }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[#F3E8FF] transition-colors text-left"
                  >
                    <span className="font-medium text-[#171717]">{course.code}</span>
                    <span className="text-muted-foreground text-xs truncate ml-2">{course.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  const detailCourse = detailCode ? allCourses.find((c) => c.code === detailCode) ?? null : null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#171717]">Prerrequisitos</h3>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Prerrequisitos ({prereqDetails.length})
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {value.map((code, i) => {
              const course = prereqDetails[i];
              return (
                <div key={code} className="flex flex-col gap-1.5 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] p-3 text-sm">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight text-[#6B21A8] truncate">{code}</p>
                      {course && <p className="text-xs text-muted-foreground truncate">{course.name}</p>}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {course && (
                        <button
                          type="button"
                          onClick={() => setDetailCode(code)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-[#E9D5FF] hover:text-[#6B21A8] transition-colors"
                          title="Ver detalles"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(code)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Quitar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {course && <p className="text-xs text-muted-foreground">{course.credits} cr · {course.weeklyHours}h/sem</p>}
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
          if (confirmRemove) { onChange(value.filter((c) => c !== confirmRemove)); setConfirmRemove(null); }
        }}
      />
    </div>
  );
}

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: 115 }} onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl bg-white p-5 shadow-xl" style={{ zIndex: 120 }} role="dialog" aria-modal>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#171717]">Detalles del curso</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#808080] hover:bg-[#f5f5f5] hover:text-[#171717] transition" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <PrereqRow label="Código" value={course.code} />
          <PrereqRow label="Nombre" value={course.name} />
          <PrereqRow label="Créditos" value={String(course.credits)} />
          <PrereqRow label="Horas semanales" value={String(course.weeklyHours)} />
          <PrereqRow label="Tipo de aula" value={course.requiredRoomType ?? "—"} />
          <PrereqRow label="Estado" value={course.isActive ? "Activo" : "Inactivo"} />
        </div>
      </div>
    </>,
    document.body
  );
}

function ConfirmRemovePrereqModal({ code, onCancel, onConfirm }: { code: string | null; onCancel: () => void; onConfirm: () => void }) {
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: 125 }} onClick={onCancel} aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" style={{ zIndex: 130 }} role="alertdialog" aria-modal>
        <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Quitar prerrequisito</h2>
        <p className="text-sm leading-relaxed text-gray-500 mb-6">¿Quitar <strong>{code}</strong> de los prerrequisitos?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700">Sí, quitar</button>
        </div>
      </div>
    </>,
    document.body
  );
}

function PrereqRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right text-[#171717]">{value}</span>
    </div>
  );
}

function flattenErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.join(".");
    if (key && !accumulator[key]) {
      accumulator[key] = issue.message;
    }
    return accumulator;
  }, {});
}
