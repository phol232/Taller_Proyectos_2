"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  BookOpen,
  Pencil,
  Power,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
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
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { toastError, toastSuccess, cn } from "@/lib/utils";
import type { CarreraAdmin, FacultadAdmin } from "@/types/admin";

// ─── Formularios ─────────────────────────────────────────────────────────────

type FacultadForm = { code: string; name: string; isActive: boolean };
type CarreraForm = { code: string; name: string; isActive: boolean };

const EMPTY_FAC: FacultadForm = { code: "", name: "", isActive: true };
const EMPTY_CAR: CarreraForm = { code: "", name: "", isActive: true };

// ─── Página principal ───────────────────────────────────────────────────────

export default function FacultadesPage() {
  const [facultades, setFacultades] = useState<FacultadAdmin[]>([]);
  const [carreras, setCarreras] = useState<CarreraAdmin[]>([]);
  const [selectedFacultadId, setSelectedFacultadId] = useState<string | null>(null);

  const [loadingFacultades, setLoadingFacultades] = useState(true);
  const [loadingCarreras, setLoadingCarreras] = useState(false);

  // Facultad dialogs
  const [facDialogOpen, setFacDialogOpen] = useState(false);
  const [editingFac, setEditingFac] = useState<FacultadAdmin | null>(null);
  const [facForm, setFacForm] = useState<FacultadForm>(EMPTY_FAC);
  const [facErrors, setFacErrors] = useState<Record<string, string>>({});
  const [facSubmitting, setFacSubmitting] = useState(false);
  const [facDeactivate, setFacDeactivate] = useState<FacultadAdmin | null>(null);
  const [facDelete, setFacDelete] = useState<FacultadAdmin | null>(null);

  // Carrera dialogs
  const [carDialogOpen, setCarDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarreraAdmin | null>(null);
  const [carForm, setCarForm] = useState<CarreraForm>(EMPTY_CAR);
  const [carErrors, setCarErrors] = useState<Record<string, string>>({});
  const [carSubmitting, setCarSubmitting] = useState(false);
  const [carDeactivate, setCarDeactivate] = useState<CarreraAdmin | null>(null);
  const [carDelete, setCarDelete] = useState<CarreraAdmin | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const selectedFacultad =
    selectedFacultadId != null
      ? facultades.find((f) => f.id === selectedFacultadId) ?? null
      : null;

  // ─── Loaders ────────────────────────────────────────────────────────

  const loadFacultades = useCallback(async () => {
    setLoadingFacultades(true);
    try {
      const data = await adminApi.listAllFacultades();
      setFacultades(data);
      // Auto-seleccionar primera si no hay selección.
      if (data.length > 0) {
        setSelectedFacultadId((current) => {
          if (current && data.some((f) => f.id === current)) return current;
          return data[0].id;
        });
      } else {
        setSelectedFacultadId(null);
      }
    } catch (error) {
      toastError(
        "No se pudieron cargar las facultades",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setLoadingFacultades(false);
    }
  }, []);

  const loadCarreras = useCallback(async (facultadId: string) => {
    setLoadingCarreras(true);
    try {
      const data = await adminApi.listAllCarrerasByFacultad(facultadId);
      setCarreras(data);
    } catch (error) {
      setCarreras([]);
      toastError(
        "No se pudieron cargar las carreras",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setLoadingCarreras(false);
    }
  }, []);

  useEffect(() => {
    void loadFacultades();
  }, [loadFacultades]);

  useEffect(() => {
    if (selectedFacultadId) {
      void loadCarreras(selectedFacultadId);
    } else {
      setCarreras([]);
    }
  }, [selectedFacultadId, loadCarreras]);

  // ─── Facultad: crear / editar ───────────────────────────────────────

  function openFacCreate() {
    setEditingFac(null);
    setFacForm(EMPTY_FAC);
    setFacErrors({});
    setFacDialogOpen(true);
  }

  function openFacEdit(facultad: FacultadAdmin) {
    setEditingFac(facultad);
    setFacForm({
      code: facultad.code,
      name: facultad.name,
      isActive: facultad.isActive,
    });
    setFacErrors({});
    setFacDialogOpen(true);
  }

  async function handleFacSubmit() {
    const errors: Record<string, string> = {};
    if (!facForm.code.trim()) errors.code = "El código es obligatorio";
    if (!facForm.name.trim()) errors.name = "El nombre es obligatorio";
    if (Object.keys(errors).length > 0) {
      setFacErrors(errors);
      return;
    }

    setFacSubmitting(true);
    try {
      if (editingFac) {
        const updated = await adminApi.updateFacultad(editingFac.id, {
          code: facForm.code.trim(),
          name: facForm.name.trim(),
          isActive: facForm.isActive,
        });
        setFacultades((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f)),
        );
        toastSuccess("Facultad actualizada");
      } else {
        const created = await adminApi.createFacultad({
          code: facForm.code.trim(),
          name: facForm.name.trim(),
        });
        setFacultades((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedFacultadId(created.id);
        toastSuccess("Facultad creada");
      }
      setFacDialogOpen(false);
    } catch (error) {
      toastError(
        "No se pudo guardar la facultad",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setFacSubmitting(false);
    }
  }

  async function handleFacDeactivate(facultad: FacultadAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateFacultad(facultad.id);
      toastSuccess("Facultad desactivada");
      setFacDeactivate(null);
      await loadFacultades();
      if (selectedFacultadId === facultad.id) {
        await loadCarreras(facultad.id);
      }
    } catch (error) {
      toastError(
        "No se pudo desactivar la facultad",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFacDelete(facultad: FacultadAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteFacultad(facultad.id);
      toastSuccess("Facultad eliminada");
      setFacDelete(null);
      if (selectedFacultadId === facultad.id) {
        setSelectedFacultadId(null);
      }
      await loadFacultades();
    } catch (error) {
      toastError(
        "No se pudo eliminar la facultad",
        getApiErrorMessage(
          error,
          "Tiene carreras o usuarios asociados. Considera desactivarla.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Carrera: crear / editar ────────────────────────────────────────

  function openCarCreate() {
    if (!selectedFacultadId) return;
    setEditingCar(null);
    setCarForm(EMPTY_CAR);
    setCarErrors({});
    setCarDialogOpen(true);
  }

  function openCarEdit(carrera: CarreraAdmin) {
    setEditingCar(carrera);
    setCarForm({
      code: carrera.code ?? "",
      name: carrera.name,
      isActive: carrera.isActive,
    });
    setCarErrors({});
    setCarDialogOpen(true);
  }

  async function handleCarSubmit() {
    if (!selectedFacultadId) return;

    const errors: Record<string, string> = {};
    if (!carForm.name.trim()) errors.name = "El nombre es obligatorio";
    if (Object.keys(errors).length > 0) {
      setCarErrors(errors);
      return;
    }

    setCarSubmitting(true);
    try {
      const codePayload = carForm.code.trim() === "" ? null : carForm.code.trim();
      if (editingCar) {
        const updated = await adminApi.updateCarrera(editingCar.id, {
          facultadId: selectedFacultadId,
          code: codePayload,
          name: carForm.name.trim(),
          isActive: carForm.isActive,
        });
        setCarreras((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        toastSuccess("Carrera actualizada");
      } else {
        const created = await adminApi.createCarrera({
          facultadId: selectedFacultadId,
          code: codePayload,
          name: carForm.name.trim(),
        });
        setCarreras((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toastSuccess("Carrera creada");
      }
      setCarDialogOpen(false);
    } catch (error) {
      toastError(
        "No se pudo guardar la carrera",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setCarSubmitting(false);
    }
  }

  async function handleCarDeactivate(carrera: CarreraAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deactivateCarrera(carrera.id);
      toastSuccess("Carrera desactivada");
      setCarDeactivate(null);
      if (selectedFacultadId) await loadCarreras(selectedFacultadId);
    } catch (error) {
      toastError(
        "No se pudo desactivar la carrera",
        getApiErrorMessage(error, "Intenta nuevamente."),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCarDelete(carrera: CarreraAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteCarrera(carrera.id);
      toastSuccess("Carrera eliminada");
      setCarDelete(null);
      if (selectedFacultadId) await loadCarreras(selectedFacultadId);
    } catch (error) {
      toastError(
        "No se pudo eliminar la carrera",
        getApiErrorMessage(
          error,
          "Tiene usuarios asociados. Considera desactivarla.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Facultades y carreras"
      description="Administra el catálogo de facultades. Selecciona una facultad para gestionar sus carreras."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Columna izquierda: Facultades ───────────────────────── */}
        <section className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/8 dark:bg-[#1a1a1a]">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/8">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#6B21A8]" />
              <h2 className="text-sm font-semibold text-[#171717] dark:text-white">
                Facultades
              </h2>
              <span className="text-xs text-gray-400">({facultades.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadFacultades()}
                disabled={loadingFacultades}
                aria-label="Recargar"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loadingFacultades && "animate-spin")} />
              </Button>
              <Button size="sm" onClick={openFacCreate}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nueva
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            {loadingFacultades ? (
              <EmptyState label="Cargando facultades…" />
            ) : facultades.length === 0 ? (
              <EmptyState label="No hay facultades. Crea la primera." />
            ) : (
              <ul className="space-y-2">
                {facultades.map((f) => (
                  <li key={f.id}>
                    <FacultadCard
                      facultad={f}
                      selected={f.id === selectedFacultadId}
                      onSelect={() => setSelectedFacultadId(f.id)}
                      onEdit={() => openFacEdit(f)}
                      onDeactivate={() => setFacDeactivate(f)}
                      onDelete={() => setFacDelete(f)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Columna derecha: Carreras de la facultad seleccionada ── */}
        <section className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/8 dark:bg-[#1a1a1a]">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/8">
            <div className="flex min-w-0 items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-[#6B21A8]" />
              <h2 className="truncate text-sm font-semibold text-[#171717] dark:text-white">
                {selectedFacultad ? `Carreras · ${selectedFacultad.name}` : "Carreras"}
              </h2>
              {selectedFacultad && (
                <span className="text-xs text-gray-400">({carreras.length})</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={openCarCreate}
              disabled={!selectedFacultadId}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nueva
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            {!selectedFacultadId ? (
              <EmptyState label="Selecciona una facultad a la izquierda." />
            ) : loadingCarreras ? (
              <EmptyState label="Cargando carreras…" />
            ) : carreras.length === 0 ? (
              <EmptyState label="Esta facultad aún no tiene carreras." />
            ) : (
              <ul className="space-y-2">
                {carreras.map((c) => (
                  <li key={c.id}>
                    <CarreraCard
                      carrera={c}
                      onEdit={() => openCarEdit(c)}
                      onDeactivate={() => setCarDeactivate(c)}
                      onDelete={() => setCarDelete(c)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Modal Facultad ─────────────────────────────────────── */}
      <Dialog open={facDialogOpen} onOpenChange={setFacDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFac ? "Editar facultad" : "Nueva facultad"}</DialogTitle>
            <DialogDescription>
              Define el código y nombre de la facultad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label="Código" error={facErrors.code}>
              <Input
                value={facForm.code}
                onChange={(e) => setFacForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="Ej. FIC"
                maxLength={20}
              />
            </FormField>
            <FormField label="Nombre" error={facErrors.name}>
              <Input
                value={facForm.name}
                onChange={(e) => setFacForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Facultad de Ingeniería"
                maxLength={255}
              />
            </FormField>
            {editingFac && (
              <FormField label="Estado">
                <SelectField
                  value={String(facForm.isActive)}
                  onChange={(v) => setFacForm((p) => ({ ...p, isActive: v === "true" }))}
                  options={[
                    { value: "true", label: "Activa" },
                    { value: "false", label: "Inactiva" },
                  ]}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFacDialogOpen(false)}
              disabled={facSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleFacSubmit()} disabled={facSubmitting}>
              {facSubmitting ? "Guardando…" : editingFac ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Carrera ──────────────────────────────────────── */}
      <Dialog open={carDialogOpen} onOpenChange={setCarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCar ? "Editar carrera" : "Nueva carrera"}</DialogTitle>
            <DialogDescription>
              {selectedFacultad
                ? `Dentro de "${selectedFacultad.name}".`
                : "Selecciona una facultad."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label="Código (opcional)" error={carErrors.code}>
              <Input
                value={carForm.code}
                onChange={(e) => setCarForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="Ej. ING-SIS"
                maxLength={20}
              />
            </FormField>
            <FormField label="Nombre" error={carErrors.name}>
              <Input
                value={carForm.name}
                onChange={(e) => setCarForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Ingeniería de Sistemas"
                maxLength={255}
              />
            </FormField>
            {editingCar && (
              <FormField label="Estado">
                <SelectField
                  value={String(carForm.isActive)}
                  onChange={(v) => setCarForm((p) => ({ ...p, isActive: v === "true" }))}
                  options={[
                    { value: "true", label: "Activa" },
                    { value: "false", label: "Inactiva" },
                  ]}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCarDialogOpen(false)}
              disabled={carSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleCarSubmit()} disabled={carSubmitting}>
              {carSubmitting ? "Guardando…" : editingCar ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm dialogs ────────────────────────────────────── */}
      <ConfirmDialog
        open={facDeactivate !== null}
        onOpenChange={(o) => !o && setFacDeactivate(null)}
        title="Desactivar facultad"
        description={
          facDeactivate
            ? `"${facDeactivate.name}" se marcará como inactiva junto con todas sus carreras. Los usuarios asociados no se verán afectados.`
            : ""
        }
        onConfirm={() => facDeactivate && void handleFacDeactivate(facDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={facDelete !== null}
        onOpenChange={(o) => !o && setFacDelete(null)}
        title="Eliminar facultad"
        description={
          facDelete
            ? `"${facDelete.name}" y todas sus carreras se eliminarán permanentemente. Esta acción no se puede deshacer.`
            : ""
        }
        onConfirm={() => facDelete && void handleFacDelete(facDelete)}
        variant="destructive"
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={carDeactivate !== null}
        onOpenChange={(o) => !o && setCarDeactivate(null)}
        title="Desactivar carrera"
        description={
          carDeactivate
            ? `"${carDeactivate.name}" se marcará como inactiva.`
            : ""
        }
        onConfirm={() => carDeactivate && void handleCarDeactivate(carDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={carDelete !== null}
        onOpenChange={(o) => !o && setCarDelete(null)}
        title="Eliminar carrera"
        description={
          carDelete
            ? `"${carDelete.name}" se eliminará permanentemente. Esta acción no se puede deshacer.`
            : ""
        }
        onConfirm={() => carDelete && void handleCarDelete(carDelete)}
        variant="destructive"
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 dark:border-white/10 dark:text-gray-500">
      {label}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        active
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
      )}
    >
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function ItemActions({
  onEdit,
  onDeactivate,
  onDelete,
  canDeactivate,
}: {
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  canDeactivate: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Editar"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeactivate();
        }}
        disabled={!canDeactivate}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-amber-500/15 dark:hover:text-amber-400"
        aria-label="Desactivar"
      >
        <Power className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
        aria-label="Eliminar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FacultadCard({
  facultad,
  selected,
  onSelect,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  facultad: FacultadAdmin;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition",
        selected
          ? "border-[#6B21A8] bg-[#6B21A8]/5 dark:border-[#A855F7] dark:bg-[#6B21A8]/10"
          : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1a1a1a] dark:hover:border-white/15 dark:hover:bg-white/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#171717] dark:text-white">
            {facultad.name}
          </p>
          <StatusBadge active={facultad.isActive} />
        </div>
        <p className="mt-0.5 font-mono text-xs text-gray-400">{facultad.code}</p>
      </div>
      <ItemActions
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onDelete={onDelete}
        canDeactivate={facultad.isActive}
      />
    </div>
  );
}

function CarreraCard({
  carrera,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  carrera: CarreraAdmin;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5 transition hover:border-gray-200 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1a1a1a] dark:hover:border-white/15 dark:hover:bg-white/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#171717] dark:text-white">
            {carrera.name}
          </p>
          <StatusBadge active={carrera.isActive} />
        </div>
        {carrera.code && (
          <p className="mt-0.5 font-mono text-xs text-gray-400">{carrera.code}</p>
        )}
      </div>
      <ItemActions
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onDelete={onDelete}
        canDeactivate={carrera.isActive}
      />
    </div>
  );
}
