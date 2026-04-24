"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  BookOpen,
  Pencil,
  Power,
  Trash2,
  Plus,
  GraduationCap,
  Layers,
  FlaskConical,
  Globe,
  Music,
  Stethoscope,
  Scale,
  Cpu,
  Tag,
  CalendarDays,
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
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { CarreraAdmin, FacultadAdmin } from "@/types/admin";

// ─── Paleta de iconos/colores para facultades ─────────────────────────────────

const FAC_PALETTE = [
  { icon: Building2,     bg: "bg-violet-100",  text: "text-violet-600" },
  { icon: FlaskConical,  bg: "bg-blue-100",    text: "text-blue-600"   },
  { icon: Globe,         bg: "bg-emerald-100", text: "text-emerald-600"},
  { icon: Stethoscope,   bg: "bg-rose-100",    text: "text-rose-600"   },
  { icon: Scale,         bg: "bg-amber-100",   text: "text-amber-600"  },
  { icon: Cpu,           bg: "bg-cyan-100",    text: "text-cyan-600"   },
  { icon: Music,         bg: "bg-pink-100",    text: "text-pink-600"   },
  { icon: GraduationCap, bg: "bg-indigo-100",  text: "text-indigo-600" },
  { icon: Layers,        bg: "bg-orange-100",  text: "text-orange-600" },
];

function getFacPalette(index: number) {
  return FAC_PALETTE[index % FAC_PALETTE.length];
}

function getIconForFacultadName(name: string): React.ElementType {
  const n = name.toLowerCase();
  if (n.includes("ingenier"))                                                  return Cpu;
  if (n.includes("medicina") || n.includes("salud") || n.includes("enferm"))   return Stethoscope;
  if (n.includes("derecho") || n.includes("jur\u00eddic") || n.includes("juridic") || n.includes("leyes")) return Scale;
  if (n.includes("arquitectura"))                                              return Building2;
  if (n.includes("m\u00fasica") || n.includes("musica") || n.includes("arte"))  return Music;
  if (n.includes("econom") || n.includes("administra") || n.includes("negocios") || n.includes("comercio")) return Layers;
  if (n.includes("ciencias") || n.includes("ciencia"))                        return FlaskConical;
  if (n.includes("humanidades") || n.includes("letras") || n.includes("filosof")) return BookOpen;
  if (n.includes("educaci") || n.includes("pedagog"))                        return GraduationCap;
  if (n.includes("computaci") || n.includes("sistemas") || n.includes("inform")) return Cpu;
  return Building2;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Formularios ─────────────────────────────────────────────────────────────

type FacultadForm = { code: string; name: string; isActive: boolean };
type CarreraForm  = { code: string; name: string; isActive: boolean };

const EMPTY_FAC: FacultadForm = { code: "", name: "", isActive: true };
const EMPTY_CAR: CarreraForm  = { code: "", name: "", isActive: true };

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FacultadesPage() {
  const [facultades, setFacultades]         = useState<FacultadAdmin[]>([]);
  const [carreras,   setCarreras]           = useState<CarreraAdmin[]>([]);
  const [loadingFacultades, setLoadingFacultades] = useState(true);
  const [loadingCarreras,   setLoadingCarreras]   = useState(false);

  // Facultad state
  const [facDialogOpen, setFacDialogOpen]   = useState(false);
  const [editingFac,    setEditingFac]      = useState<FacultadAdmin | null>(null);
  const [facForm,       setFacForm]         = useState<FacultadForm>(EMPTY_FAC);
  const [facErrors,     setFacErrors]       = useState<Record<string, string>>({});
  const [facSubmitting, setFacSubmitting]   = useState(false);
  const [facDeactivate, setFacDeactivate]   = useState<FacultadAdmin | null>(null);
  const [facDelete,     setFacDelete]       = useState<FacultadAdmin | null>(null);

  // Carreras modal state
  const [carModalOpen,  setCarModalOpen]    = useState(false);
  const [activeFacultad, setActiveFacultad] = useState<FacultadAdmin | null>(null);
  const [activeFacIndex, setActiveFacIndex] = useState(0);

  // Carrera CRUD state
  const [carDialogOpen, setCarDialogOpen]   = useState(false);
  const [editingCar,    setEditingCar]      = useState<CarreraAdmin | null>(null);
  const [carForm,       setCarForm]         = useState<CarreraForm>(EMPTY_CAR);
  const [carErrors,     setCarErrors]       = useState<Record<string, string>>({});
  const [carSubmitting, setCarSubmitting]   = useState(false);
  const [carDeactivate, setCarDeactivate]   = useState<CarreraAdmin | null>(null);
  const [carDelete,     setCarDelete]       = useState<CarreraAdmin | null>(null);

  const [actionLoading, setActionLoading]   = useState(false);

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadFacultades = useCallback(async () => {
    setLoadingFacultades(true);
    try {
      const data = await adminApi.listAllFacultades();
      setFacultades(data);
    } catch (error) {
      toastError("No se pudieron cargar las facultades", getApiErrorMessage(error, "Intenta nuevamente."));
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
      toastError("No se pudieron cargar las carreras", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoadingCarreras(false);
    }
  }, []);

  useEffect(() => { void loadFacultades(); }, [loadFacultades]);

  useAdminEvents("facultades.changed", () => void loadFacultades());
  useAdminEvents("carreras.changed", () => {
    if (activeFacultad) void loadCarreras(activeFacultad.id);
  });

  // ─── Abrir modal de carreras ───────────────────────────────────────────────

  function openCarreras(facultad: FacultadAdmin, index: number) {
    setActiveFacultad(facultad);
    setActiveFacIndex(index);
    setCarModalOpen(true);
    void loadCarreras(facultad.id);
  }

  // ─── Facultad CRUD ─────────────────────────────────────────────────────────

  function openFacCreate() {
    setEditingFac(null);
    setFacForm(EMPTY_FAC);
    setFacErrors({});
    setFacDialogOpen(true);
  }

  function openFacEdit(facultad: FacultadAdmin) {
    setEditingFac(facultad);
    setFacForm({ code: facultad.code, name: facultad.name, isActive: facultad.isActive });
    setFacErrors({});
    setFacDialogOpen(true);
  }

  async function handleFacSubmit() {
    const errors: Record<string, string> = {};
    if (!facForm.code.trim()) errors.code = "El código es obligatorio";
    if (!facForm.name.trim()) errors.name = "El nombre es obligatorio";
    if (Object.keys(errors).length > 0) { setFacErrors(errors); return; }

    setFacSubmitting(true);
    try {
      if (editingFac) {
        const updated = await adminApi.updateFacultad(editingFac.id, {
          code: facForm.code.trim(), name: facForm.name.trim(), isActive: facForm.isActive,
        });
        setFacultades((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        toastSuccess("Facultad actualizada");
      } else {
        const created = await adminApi.createFacultad({ code: facForm.code.trim(), name: facForm.name.trim() });
        setFacultades((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toastSuccess("Facultad creada");
      }
      setFacDialogOpen(false);
    } catch (error) {
      toastError("No se pudo guardar la facultad", getApiErrorMessage(error, "Intenta nuevamente."));
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
    } catch (error) {
      toastError("No se pudo desactivar la facultad", getApiErrorMessage(error, "Intenta nuevamente."));
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
      await loadFacultades();
    } catch (error) {
      toastError("No se pudo eliminar la facultad", getApiErrorMessage(error, "Tiene carreras o usuarios asociados. Considera desactivarla."));
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Carrera CRUD ──────────────────────────────────────────────────────────

  function openCarCreate() {
    setEditingCar(null);
    setCarForm(EMPTY_CAR);
    setCarErrors({});
    setCarDialogOpen(true);
  }

  function openCarEdit(carrera: CarreraAdmin) {
    setEditingCar(carrera);
    setCarForm({ code: carrera.code ?? "", name: carrera.name, isActive: carrera.isActive });
    setCarErrors({});
    setCarDialogOpen(true);
  }

  async function handleCarSubmit() {
    if (!activeFacultad) return;
    const errors: Record<string, string> = {};
    if (!carForm.name.trim()) errors.name = "El nombre es obligatorio";
    if (Object.keys(errors).length > 0) { setCarErrors(errors); return; }

    setCarSubmitting(true);
    try {
      const codePayload = carForm.code.trim() === "" ? null : carForm.code.trim();
      if (editingCar) {
        const updated = await adminApi.updateCarrera(editingCar.id, {
          facultadId: activeFacultad.id, code: codePayload, name: carForm.name.trim(), isActive: carForm.isActive,
        });
        setCarreras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toastSuccess("Carrera actualizada");
      } else {
        const created = await adminApi.createCarrera({ facultadId: activeFacultad.id, code: codePayload, name: carForm.name.trim() });
        setCarreras((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toastSuccess("Carrera creada");
      }
      setCarDialogOpen(false);
    } catch (error) {
      toastError("No se pudo guardar la carrera", getApiErrorMessage(error, "Intenta nuevamente."));
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
      if (activeFacultad) await loadCarreras(activeFacultad.id);
    } catch (error) {
      toastError("No se pudo desactivar la carrera", getApiErrorMessage(error, "Intenta nuevamente."));
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
      if (activeFacultad) await loadCarreras(activeFacultad.id);
    } catch (error) {
      toastError("No se pudo eliminar la carrera", getApiErrorMessage(error, "Tiene usuarios asociados. Considera desactivarla."));
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Facultades y carreras"
      actions={
        <Button onClick={openFacCreate} className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]">
          <Plus className="h-4 w-4" />
          Nueva facultad
        </Button>
      }
    >
      {/* ── Grid de facultades 3 columnas ─── */}
      {loadingFacultades ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : facultades.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <Building2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">No hay facultades. Crea la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facultades.map((fac, idx) => (
            <FacultadCard
              key={fac.id}
              facultad={fac}
              paletteIndex={idx}
              onCarreras={() => openCarreras(fac, idx)}
              onEdit={() => openFacEdit(fac)}
              onDeactivate={() => setFacDeactivate(fac)}
              onDelete={() => setFacDelete(fac)}
            />
          ))}
        </div>
      )}

      {/* ── Modal de Carreras ─────────────────────────────────────── */}
      <Dialog open={carModalOpen} onOpenChange={setCarModalOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[52rem]">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <DialogTitle>Carreras · {activeFacultad?.name ?? ""}</DialogTitle>
            <DialogDescription>Gestiona las carreras de esta facultad.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3">
            <span className="text-xs text-muted-foreground">{carreras.length} {carreras.length === 1 ? "carrera" : "carreras"}</span>
            <Button
              onClick={openCarCreate}
              className="h-8 rounded-md bg-[#6B21A8] px-3 text-xs text-white hover:bg-[#581C87]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva carrera
            </Button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
            {loadingCarreras ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : carreras.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
                <BookOpen className="h-6 w-6 opacity-40" />
                <p className="text-sm">Esta facultad aún no tiene carreras.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {carreras.map((c) => (
                  <CarreraCard
                    key={c.id}
                    carrera={c}
                    paletteIndex={activeFacIndex}
                    onEdit={() => openCarEdit(c)}
                    onDeactivate={() => setCarDeactivate(c)}
                    onDelete={() => setCarDelete(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Facultad (crear / editar) ──────────────────────── */}
      <Dialog open={facDialogOpen} onOpenChange={setFacDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFac ? "Editar facultad" : "Nueva facultad"}</DialogTitle>
            <DialogDescription>Define el código y nombre de la facultad.</DialogDescription>
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
                  options={[{ value: "true", label: "Activa" }, { value: "false", label: "Inactiva" }]}
                />
              </FormField>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacDialogOpen(false)} disabled={facSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleFacSubmit()} disabled={facSubmitting}>
              {facSubmitting ? "Guardando…" : editingFac ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Carrera (crear / editar) ───────────────────────── */}
      <Dialog open={carDialogOpen} onOpenChange={setCarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCar ? "Editar carrera" : "Nueva carrera"}</DialogTitle>
            <DialogDescription>
              {activeFacultad ? `Dentro de "${activeFacultad.name}".` : "Selecciona una facultad."}
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
                  options={[{ value: "true", label: "Activa" }, { value: "false", label: "Inactiva" }]}
                />
              </FormField>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarDialogOpen(false)} disabled={carSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCarSubmit()} disabled={carSubmitting}>
              {carSubmitting ? "Guardando…" : editingCar ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirms ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={facDeactivate !== null}
        onOpenChange={(o) => !o && setFacDeactivate(null)}
        title="Desactivar facultad"
        description={facDeactivate ? `"${facDeactivate.name}" se marcará como inactiva junto con todas sus carreras.` : ""}
        onConfirm={() => facDeactivate && void handleFacDeactivate(facDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={facDelete !== null}
        onOpenChange={(o) => !o && setFacDelete(null)}
        title="Eliminar facultad"
        description={facDelete ? `"${facDelete.name}" y todas sus carreras se eliminarán permanentemente.` : ""}
        onConfirm={() => facDelete && void handleFacDelete(facDelete)}
        variant="destructive"
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={carDeactivate !== null}
        onOpenChange={(o) => !o && setCarDeactivate(null)}
        title="Desactivar carrera"
        description={carDeactivate ? `"${carDeactivate.name}" se marcará como inactiva.` : ""}
        onConfirm={() => carDeactivate && void handleCarDeactivate(carDeactivate)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={carDelete !== null}
        onOpenChange={(o) => !o && setCarDelete(null)}
        title="Eliminar carrera"
        description={carDelete ? `"${carDelete.name}" se eliminará permanentemente.` : ""}
        onConfirm={() => carDelete && void handleCarDelete(carDelete)}
        variant="destructive"
        isLoading={actionLoading}
      />
    </PageShell>
  );
}

// ─── FacultadCard ─────────────────────────────────────────────────────────────

function FacultadCard({
  facultad,
  paletteIndex,
  onCarreras,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  facultad: FacultadAdmin;
  paletteIndex: number;
  onCarreras: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getFacPalette(paletteIndex);
  const Icon = getIconForFacultadName(facultad.name);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header con icono grande + nombre */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{facultad.name}</p>
      </div>

      {/* Datos con iconos individuales */}
      <div className="space-y-1.5 px-4 pb-3">
        <DataRow icon={<Tag className="h-3.5 w-3.5 text-amber-500" />} label={facultad.code} mono />
        <DataRow
          icon={<span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold", facultad.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white")}>{facultad.isActive ? "✓" : "✕"}</span>}
          label={facultad.isActive ? "Activa" : "Inactiva"}
          labelClass={facultad.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground"}
        />
        {facultad.createdAt && (
          <DataRow icon={<CalendarDays className="h-3.5 w-3.5 text-indigo-400" />} label={`Creado: ${fmtDate(facultad.createdAt)}`} />
        )}
        {facultad.updatedAt && facultad.updatedAt !== facultad.createdAt && (
          <DataRow icon={<RefreshCw className="h-3.5 w-3.5 text-sky-400" />} label={`Actualizado: ${fmtDate(facultad.updatedAt)}`} />
        )}
      </div>

      <div className="border-t border-border mx-4" />

      {/* Botón Carreras */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onCarreras}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
            palette.bg, palette.text, "hover:opacity-80",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Ver carreras
        </button>
      </div>

      <div className="border-t border-border mx-4" />

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-1.5 p-3">
        <ActionButton label="Editar" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} variant="neutral" />
        <ActionButton label="Desactivar" icon={<Power className="h-3.5 w-3.5" />} onClick={onDeactivate} disabled={!facultad.isActive} variant="warning" />
        <ActionButton label="Eliminar" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} variant="danger" className="col-span-2" />
      </div>
    </div>
  );
}

// ─── CarreraCard ──────────────────────────────────────────────────────────────

function CarreraCard({
  carrera,
  paletteIndex,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  carrera: CarreraAdmin;
  paletteIndex: number;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const palette = getFacPalette(paletteIndex);
  const Icon = GraduationCap;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl dark:opacity-80", palette.bg)}>
          <Icon className={cn("h-7 w-7", palette.text)} />
        </div>
        <p className="truncate text-sm font-semibold text-card-foreground">{carrera.name}</p>
      </div>

      {/* Datos con iconos */}
      <div className="space-y-1.5 px-4 pb-3">
        {carrera.code && (
          <DataRow icon={<Tag className="h-3.5 w-3.5 text-amber-500" />} label={carrera.code} mono />
        )}
        <DataRow
          icon={<span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold", carrera.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white")}>{carrera.isActive ? "✓" : "✕"}</span>}
          label={carrera.isActive ? "Activa" : "Inactiva"}
          labelClass={carrera.isActive ? "text-green-500 dark:text-green-400" : "text-muted-foreground"}
        />
        {carrera.createdAt && (
          <DataRow icon={<CalendarDays className="h-3.5 w-3.5 text-indigo-400" />} label={`Creado: ${fmtDate(carrera.createdAt)}`} />
        )}
        {carrera.updatedAt && carrera.updatedAt !== carrera.createdAt && (
          <DataRow icon={<RefreshCw className="h-3.5 w-3.5 text-sky-400" />} label={`Actualizado: ${fmtDate(carrera.updatedAt)}`} />
        )}
      </div>

      <div className="border-t border-border mx-4" />

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
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
          disabled={!carrera.isActive}
          variant="warning"
        />
        <ActionButton
          label="Eliminar"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={onDelete}
          variant="danger"
        />
      </div>
    </div>
  );
}

// ─── DataRow ──────────────────────────────────────────────────────────────────

function DataRow({
  icon,
  label,
  mono,
  labelClass,
}: {
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className={cn("text-xs text-muted-foreground", mono && "font-mono", labelClass)}>
        {label}
      </span>
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
