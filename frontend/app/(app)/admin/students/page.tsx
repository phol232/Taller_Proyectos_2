"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";
import { ApprovedCoursePicker } from "@/components/admin/ApprovedCoursePicker";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { studentSchema } from "@/lib/validators/student.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import { joinFullName, splitFullName } from "@/lib/fullName";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { CarreraAdmin, FacultadAdmin, StudentAdmin } from "@/types/admin";

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

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentAdmin | null>(null);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [careerFilter, setCareerFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("");

  const [confirmDeactivate, setConfirmDeactivate] = useState<StudentAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StudentAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [facultades, setFacultades] = useState<FacultadAdmin[]>([]);
  const [carreras, setCarreras] = useState<CarreraAdmin[]>([]);
  const [carrerasLoading, setCarrerasLoading] = useState(false);

  useEffect(() => {
    void loadStudents(query);
  }, [query]);

  useAdminEvents("students.changed", () => void loadStudents(query));

  useEffect(() => {
    adminApi.listCatalogFacultades().then(setFacultades).catch(() => {});
  }, []);

  // Recarga carreras cuando cambia la facultad seleccionada en el form.
  useEffect(() => {
    if (!form.facultadId) {
      setCarreras([]);
      return;
    }
    setCarrerasLoading(true);
    adminApi.listCatalogCarreras(form.facultadId)
      .then(setCarreras)
      .catch(() => setCarreras([]))
      .finally(() => setCarrerasLoading(false));
  }, [form.facultadId]);

  async function loadStudents(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchStudents(search.trim())
        : await adminApi.listStudents();
      setStudents(data);
    } catch (error) {
      toastError("No se pudieron cargar los estudiantes", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  const careers = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.career).filter((c): c is string => Boolean(c)))
      ).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (careerFilter !== "all" && s.career !== careerFilter) return false;
      if (cycleFilter.trim() && s.cycle !== Number(cycleFilter)) return false;
      return true;
    });
  }, [students, statusFilter, careerFilter, cycleFilter]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (careerFilter !== "all" ? 1 : 0) +
    (cycleFilter.trim() ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setCareerFilter("all");
    setCycleFilter("");
  }

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
        await adminApi.updateStudent(editing.id, payload);
        toastSuccess("Estudiante actualizado");
      } else {
        await adminApi.createStudent(payload);
        toastSuccess("Estudiante creado");
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await loadStudents(query);
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
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <CrudPageLayout
        title="Estudiantes"
        description="Gestiona estudiantes, ciclo, carrera y cursos aprobados."
        data={filteredStudents}
        getRowId={(student) => student.id}
        isLoading={loading}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar..."
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        dialogTitle={editing ? "Editar estudiante" : "Nuevo estudiante"}
        dialogDescription="Configura la ficha académica, la carrera y los cursos aprobados del estudiante."
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
                  <label className="block text-sm font-medium text-[#171717]">Carrera</label>
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
                  <label className="block text-sm font-medium text-[#171717]">Ciclo</label>
                  <Input
                    type="number"
                    min={1}
                    value={cycleFilter}
                    onChange={(event) => setCycleFilter(event.target.value)}
                    placeholder="Ej. 3"
                  />
                </div>
              </>
            }
          />
        }
        columns={[
          { key: "code", label: "Código", sortable: true, sortAccessor: (s) => s.code, render: (s) => s.code },
          { key: "name", label: "Nombre", sortable: true, sortAccessor: (s) => s.fullName, render: (s) => s.fullName },
          { key: "cycle", label: "Ciclo", sortable: true, sortAccessor: (s) => s.cycle, render: (s) => s.cycle },
          { key: "career", label: "Carrera", sortable: true, sortAccessor: (s) => s.career, render: (s) => s.career },
          { key: "credits", label: "Límite", sortable: true, sortAccessor: (s) => s.creditLimit, render: (s) => s.creditLimit },
          {
            key: "status",
            label: "Estado",
            sortable: true,
            sortAccessor: (s) => (s.isActive ? 1 : 0),
            render: (s) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.isActive ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (student) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(student)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(student)}>
                  Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(student)}>
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Ficha académica</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombres" error={errors.nombres ?? errors.fullName}>
                <Input
                  value={form.nombres}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombres: event.target.value }))}
                  placeholder="Nombres"
                />
              </FormField>
              <FormField label="Apellidos" error={errors.apellidos}>
                <Input
                  value={form.apellidos}
                  onChange={(event) => setForm((prev) => ({ ...prev, apellidos: event.target.value }))}
                  placeholder="Apellido paterno materno"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ciclo" error={errors.cycle}>
                <Input type="number" value={form.cycle} onChange={(event) => setForm((prev) => ({ ...prev, cycle: Number(event.target.value) }))} />
              </FormField>
              <FormField label="Límite créditos" error={errors.creditLimit}>
                <Input type="number" value={form.creditLimit} onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: Number(event.target.value) }))} />
              </FormField>
            </div>
            <FormField label="Carrera" error={errors.carreraId ?? errors.facultadId}>
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  value={form.facultadId}
                  onChange={(v) => setForm((prev) => ({ ...prev, facultadId: v, carreraId: "" }))}
                  options={[
                    { value: "", label: "— Facultad —" },
                    ...facultades.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
                <SelectField
                  value={form.carreraId}
                  onChange={(v) => setForm((prev) => ({ ...prev, carreraId: v }))}
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
              </div>
            </FormField>
            {editing && (
              <FormField label="Correo institucional">
                <Input value={form.email || "—"} disabled readOnly />
              </FormField>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Cursos aprobados</h3>
            <ApprovedCoursePicker
              value={form.approvedCourses}
              onChange={(approvedCourses) => setForm((prev) => ({ ...prev, approvedCourses }))}
              error={errors.approvedCourses}
            />
          </div>
        </div>
      </CrudPageLayout>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desactivar estudiante"
        description={`¿Desactivar a "${confirmDeactivate?.fullName}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar estudiante"
        description={`Esta acción es permanente. "${confirmDelete?.fullName}" será eliminado definitivamente. Si tiene registros asociados, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </>
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
