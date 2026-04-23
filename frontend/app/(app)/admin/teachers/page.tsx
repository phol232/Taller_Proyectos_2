"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { teacherSchema } from "@/lib/validators/teacher.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import { joinFullName, splitFullName } from "@/lib/fullName";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { TeacherAdmin, AvailabilitySlot } from "@/types/admin";

type TeacherFormState = {
  userId: string;
  code: string;
  apellidos: string;
  nombres: string;
  specialty: string;
  isActive: boolean;
  availability: AvailabilitySlot[];
};

const EMPTY_FORM: TeacherFormState = {
  userId: "",
  code: "",
  apellidos: "",
  nombres: "",
  specialty: "",
  isActive: true,
  availability: [],
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAdmin | null>(null);
  const [form, setForm] = useState<TeacherFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");

  const [confirmDeactivate, setConfirmDeactivate] = useState<TeacherAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeacherAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadTeachers(query);
  }, [query]);

  useAdminEvents("teachers.changed", () => void loadTeachers(query));

  async function loadTeachers(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchTeachers(search.trim())
        : await adminApi.listTeachers();
      setTeachers(data);
    } catch (error) {
      toastError("No se pudieron cargar los docentes", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  const specialties = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.specialty).filter(Boolean))).sort(),
    [teachers]
  );

  const filtered = useMemo(
    () =>
      teachers.filter((t) => {
        if (statusFilter === "active" && !t.isActive) return false;
        if (statusFilter === "inactive" && t.isActive) return false;
        if (specialtyFilter !== "all" && t.specialty !== specialtyFilter) return false;
        return true;
      }),
    [teachers, statusFilter, specialtyFilter]
  );

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (specialtyFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setSpecialtyFilter("all");
  }

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
      specialty: form.specialty,
      isActive: form.isActive,
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
        await adminApi.updateTeacher(editing.id, payload);
        toastSuccess("Docente actualizado");
      } else {
        await adminApi.createTeacher(payload);
        toastSuccess("Docente creado");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await loadTeachers(query);
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
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarlo.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <CrudPageLayout
        title="Docentes"
        description="Gestiona docentes, especialidades y disponibilidad horaria."
        data={filtered}
        getRowId={(teacher) => teacher.id}
        isLoading={loading}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar..."
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        dialogTitle={editing ? "Editar docente" : "Nuevo docente"}
        dialogDescription="Registra la identidad académica del docente, su especialidad y sus franjas disponibles."
        onCreate={openCreate}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        dialogContentClassName="sm:max-w-[63rem]"
        filters={
          <FiltersPopover
            activeCount={activeFiltersCount}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onClear={clearFilters}
            extraFilters={
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#171717]">Especialidad</label>
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
        }
        columns={[
          { key: "code", label: "Código", sortable: true, sortAccessor: (t) => t.code, render: (t) => t.code },
          { key: "name", label: "Nombre", sortable: true, sortAccessor: (t) => t.fullName, render: (t) => t.fullName },
          { key: "specialty", label: "Especialidad", sortable: true, sortAccessor: (t) => t.specialty, render: (t) => t.specialty },
          { key: "slots", label: "Franjas", sortable: true, sortAccessor: (t) => t.availability.length, render: (t) => t.availability.length },
          {
            key: "status",
            label: "Estado",
            sortable: true,
            sortAccessor: (t) => (t.isActive ? 1 : 0),
            render: (t) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t.isActive ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (teacher) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(teacher)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(teacher)}>
                  Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(teacher)}>
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      >
        <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Ficha del docente</h3>
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
            <FormField label="Especialidad" error={errors.specialty}>
              <Input value={form.specialty} onChange={(event) => setForm((prev) => ({ ...prev, specialty: event.target.value }))} />
            </FormField>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Disponibilidad horaria</h3>
            <AvailabilityEditor
              label=""
              value={form.availability}
              onChange={(availability) => setForm((prev) => ({ ...prev, availability }))}
            />
          </div>
        </div>
      </CrudPageLayout>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desactivar docente"
        description={`¿Desactivar a "${confirmDeactivate?.fullName}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar docente"
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
