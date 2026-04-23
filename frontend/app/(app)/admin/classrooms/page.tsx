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
import { classroomSchema } from "@/lib/validators/classroom.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import type { ClassroomAdmin, AvailabilitySlot } from "@/types/admin";

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

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomAdmin | null>(null);
  const [form, setForm] = useState<ClassroomFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minCapacity, setMinCapacity] = useState<string>("");
  const [maxCapacity, setMaxCapacity] = useState<string>("");

  const [confirmDeactivate, setConfirmDeactivate] = useState<ClassroomAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ClassroomAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadClassrooms(query);
  }, [query]);

  async function loadClassrooms(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchClassrooms(search.trim())
        : await adminApi.listClassrooms();
      setClassrooms(data);
    } catch (error) {
      toastError("No se pudieron cargar las aulas", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  const types = useMemo(
    () => Array.from(new Set(classrooms.map((c) => c.type).filter(Boolean))).sort(),
    [classrooms]
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
    [classrooms, statusFilter, typeFilter, minCapacity, maxCapacity]
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
        await adminApi.updateClassroom(editing.id, payload);
        toastSuccess("Aula actualizada");
      } else {
        await adminApi.createClassroom(payload);
        toastSuccess("Aula creada");
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await loadClassrooms(query);
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
        getApiErrorMessage(error, "Tiene registros dependientes. Considera desactivarla.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <CrudPageLayout
        title="Aulas"
        description="Gestiona aulas, capacidad, tipo y disponibilidad horaria."
        data={filtered}
        getRowId={(classroom) => classroom.id}
        isLoading={loading}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar..."
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        dialogTitle={editing ? "Editar aula" : "Nueva aula"}
        dialogDescription="Configura la capacidad y la disponibilidad operativa del aula."
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
                  <label className="block text-sm font-medium text-[#171717]">Tipo</label>
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
                  <label className="block text-sm font-medium text-[#171717]">Capacidad</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={minCapacity}
                      onChange={(event) => setMinCapacity(event.target.value)}
                      placeholder="Mín."
                    />
                    <Input
                      type="number"
                      min={0}
                      value={maxCapacity}
                      onChange={(event) => setMaxCapacity(event.target.value)}
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
          { key: "capacity", label: "Capacidad", sortable: true, sortAccessor: (c) => c.capacity, render: (c) => c.capacity },
          { key: "type", label: "Tipo", sortable: true, sortAccessor: (c) => c.type, render: (c) => c.type },
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
            render: (classroom) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(classroom)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(classroom)}>
                  Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(classroom)}>
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Código" error={errors.code}>
            <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          </FormField>
          <FormField label="Nombre" error={errors.name}>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </FormField>
          <FormField label="Capacidad" error={errors.capacity}>
            <Input type="number" value={form.capacity} onChange={(event) => setForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} />
          </FormField>
          <FormField label="Tipo" error={errors.type}>
            <Input value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} />
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
        <div className="mt-4">
          <AvailabilityEditor
            label="Disponibilidad"
            value={form.availability}
            onChange={(availability) => setForm((prev) => ({ ...prev, availability }))}
          />
        </div>
      </CrudPageLayout>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desactivar aula"
        description={`¿Desactivar "${confirmDeactivate?.name}"? Podrá reactivarse luego editando el registro.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar aula"
        description={`Esta acción es permanente. "${confirmDelete?.name}" será eliminada definitivamente. Si tiene asignaciones, no podrá eliminarse.`}
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
