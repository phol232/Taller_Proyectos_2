"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";
import { FiltersPopover, type StatusFilter } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { academicPeriodSchema } from "@/lib/validators/academic-period.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AcademicPeriodAdmin } from "@/types/admin";

type AcademicPeriodFormState = {
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "PLANNING" | "ACTIVE" | "CLOSED";
  maxStudentCredits: number;
};

function createEmptyForm(): AcademicPeriodFormState {
  return {
    code: "",
    name: "",
    startsAt: "",
    endsAt: "",
    status: "PLANNING",
    maxStudentCredits: 22,
  };
}

type LifecycleFilter = "all" | "PLANNING" | "ACTIVE" | "CLOSED";

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
    <>
      <CrudPageLayout
        title="Períodos académicos"
        data={filtered}
        getRowId={(period) => period.id}
        isLoading={loading}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar..."
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
        dialogTitle={editing ? "Editar período académico" : "Nuevo período académico"}
        dialogDescription="Configura el ciclo académico que luego usarán las ofertas y el solver."
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#171717]">Etapa</label>
                <SelectField
                  value={lifecycleFilter}
                  onChange={(v) => setLifecycleFilter(v as LifecycleFilter)}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "PLANNING", label: "Planificación" },
                    { value: "ACTIVE", label: "Activo" },
                    { value: "CLOSED", label: "Cerrado" },
                  ]}
                />
              </div>
            }
          />
        }
        columns={[
          { key: "code", label: "Código", sortable: true, sortAccessor: (p) => p.code, render: (p) => p.code },
          { key: "name", label: "Nombre", sortable: true, sortAccessor: (p) => p.name, render: (p) => p.name },
          {
            key: "range",
            label: "Rango",
            sortable: true,
            sortAccessor: (p) => p.startsAt,
            render: (p) => `${p.startsAt} → ${p.endsAt}`,
          },
          { key: "lifecycle", label: "Etapa", sortable: true, sortAccessor: (p) => p.status, render: (p) => p.status },
          {
            key: "credits",
            label: "Créditos",
            sortable: true,
            sortAccessor: (p) => p.maxStudentCredits,
            render: (p) => p.maxStudentCredits,
          },
          {
            key: "status",
            label: "Estado",
            sortable: true,
            sortAccessor: (p) => (p.isActive ? 1 : 0),
            render: (p) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.isActive ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Acciones",
            render: (period) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(period)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeactivate(period)}>
                  Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(period)}>
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
          <FormField label="Fecha de inicio" error={errors.startsAt}>
            <Input type="date" value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
          </FormField>
          <FormField label="Fecha de fin" error={errors.endsAt}>
            <Input type="date" value={form.endsAt} onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
          </FormField>
          <FormField label="Estado" error={errors.status}>
            <SelectField
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v as AcademicPeriodFormState["status"] }))}
              options={[
                { value: "PLANNING", label: "PLANNING" },
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "CLOSED", label: "CLOSED" },
              ]}
            />
          </FormField>
          <FormField label="Máximo de créditos" error={errors.maxStudentCredits}>
            <Input type="number" value={form.maxStudentCredits} onChange={(event) => setForm((prev) => ({ ...prev, maxStudentCredits: Number(event.target.value) }))} />
          </FormField>
        </div>
      </CrudPageLayout>

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
