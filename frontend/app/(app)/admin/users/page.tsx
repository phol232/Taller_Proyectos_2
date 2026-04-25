"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Mail,
  Plus,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import PageShell from "@/components/layout/PageShell";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import type { CreateUserInput, UserAdmin } from "@/types/admin";

const ROLE_LABELS: Record<UserAdmin["role"], string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordinador",
  TEACHER: "Docente",
  STUDENT: "Estudiante",
};

const EMPTY_FORM: CreateUserInput = {
  email: "",
  password: "",
  fullName: "",
  role: "STUDENT",
  active: true,
  emailVerified: false,
};

type FormErrors = Partial<Record<keyof CreateUserInput, string>>;

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function getPasswordError(password: string) {
  if (!password) return "La contraseña es obligatoria.";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 100) return "La contraseña no puede superar 100 caracteres.";
  if ([...password].some((char) => /\s/.test(char))) {
    return "La contraseña no puede contener espacios.";
  }
  if (![...password].some((char) => char >= "A" && char <= "Z")) {
    return "La contraseña debe incluir una mayúscula.";
  }
  if (![...password].some((char) => char >= "a" && char <= "z")) {
    return "La contraseña debe incluir una minúscula.";
  }
  if (![...password].some((char) => char >= "0" && char <= "9")) {
    return "La contraseña debe incluir un número.";
  }
  if (![...password].some((char) => /[^A-Za-z0-9\s]/.test(char))) {
    return "La contraseña debe incluir un carácter especial.";
  }
  return undefined;
}

function validateForm(form: CreateUserInput) {
  const errors: FormErrors = {};
  if (!form.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ingresa un email válido.";
  }
  if (!form.fullName.trim()) {
    errors.fullName = "El nombre completo es obligatorio.";
  }
  const passwordError = getPasswordError(form.password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserAdmin["role"] | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<UserAdmin | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  async function loadUsers(search = query.trim(), pg = page) {
    setLoading(true);
    try {
      const data = search
        ? await adminApi.searchUsers(search, pg)
        : await adminApi.listUsers(pg);
      setUsers(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      toastError("No se pudieron cargar los usuarios", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const trimmedQuery = query.trim();

    const timeout = window.setTimeout(() => {
      void loadUsers(trimmedQuery, page);
    }, trimmedQuery ? 250 : 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page]);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function openCreateDialog() {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function handleCreateUser() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await adminApi.createUser({
        ...form,
        email: form.email.trim().toLowerCase(),
        fullName: form.fullName.trim(),
      });
      toastSuccess("Usuario creado", "La cuenta fue registrada correctamente.");
      setDialogOpen(false);
      await loadUsers(query.trim());
    } catch (error) {
      toastError("No se pudo crear el usuario", getApiErrorMessage(error, "Revisa los datos e intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUserStatus(user: UserAdmin) {
    setStatusUpdatingId(user.id);
    try {
      const updated = user.active
        ? await adminApi.deactivateUser(user.id)
        : await adminApi.activateUser(user.id);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toastSuccess(
        user.active ? "Usuario desactivado" : "Usuario activado",
        user.active
          ? "La cuenta y su verificación quedaron deshabilitadas."
          : "La cuenta y su verificación quedaron habilitadas."
      );
    } catch (error) {
      toastError(
        user.active ? "No se pudo desactivar el usuario" : "No se pudo activar el usuario",
        getApiErrorMessage(error, "Intenta nuevamente.")
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !user.active) return false;
      if (statusFilter === "INACTIVE" && user.active) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  return (
    <>
    <PageShell
      title="Usuarios"

      actions={
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Buscar por nombre"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "ADMIN", "COORDINATOR", "TEACHER", "STUDENT"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={cn(
                "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                roleFilter === role
                  ? "border-[#6B21A8] bg-[#6B21A8] text-white"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {role === "ALL" ? "Todos" : ROLE_LABELS[role]}
            </button>
          ))}

          <div className="mx-1 w-px self-stretch bg-border" />

          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                statusFilter === status
                  ? "border-[#6B21A8] bg-[#6B21A8] text-white"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {status === "ALL" ? "Todos" : status === "ACTIVE" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Card key={item} className="h-64 animate-pulse rounded-lg border border-border bg-card p-5 shadow-none">
              <div className="mb-4 h-10 w-10 rounded-lg bg-muted" />
              <div className="mb-2 h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted/60" />
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="rounded-lg border border-border bg-card p-8 text-center shadow-none">
          <p className="text-sm font-medium text-foreground">No hay usuarios para mostrar.</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajusta la búsqueda o los filtros.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="rounded-lg border border-border bg-card p-5 shadow-none transition-colors hover:border-border/80">
              <div className="mb-4 flex items-start gap-3">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#6B21A8]/10 text-sm font-semibold text-[#6B21A8]">
                    {getInitials(user.fullName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-card-foreground">{user.fullName}</h2>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#6B21A8]/10 px-2 py-1 text-xs font-medium text-[#6B21A8] dark:text-purple-300">
                  <Shield className="h-3.5 w-3.5" />
                  {ROLE_LABELS[user.role]}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                    user.active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  )}
                >
                  {user.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {user.active ? "Activo" : "Inactivo"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                    user.emailVerified
                      ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  )}
                >
                  {user.emailVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {user.emailVerified ? "Verificado" : "Sin verificar"}
                </span>
              </div>

              <dl className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="max-w-[170px] truncate font-mono text-foreground/70">{user.id}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">password_hash</dt>
                  <dd className="font-mono text-foreground/70">{user.passwordHash ?? "NULL"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">avatar_url</dt>
                  <dd className="max-w-[170px] truncate text-foreground/70">{user.avatarUrl ?? "NULL"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">created_at</dt>
                  <dd className="text-right text-foreground/70">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">updated_at</dt>
                  <dd className="text-right text-foreground/70">{formatDate(user.updatedAt)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant={user.active ? "outline" : "default"}
                  onClick={() =>
                    user.active
                      ? setConfirmDeactivate(user)
                      : void handleToggleUserStatus(user)
                  }
                  disabled={statusUpdatingId === user.id}
                >
                  {statusUpdatingId === user.id
                    ? "Procesando..."
                    : user.active
                      ? "Desactivar"
                      : "Activar"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-sm mt-2">
          <span className="text-muted-foreground">Página {page} de {totalPages} &mdash; {totalCount} registros</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </PageShell>

    <ConfirmDialog
      open={!!confirmDeactivate}
      onOpenChange={(o) => !o && setConfirmDeactivate(null)}
      title="Desactivar usuario"
      description={`¿Desactivar la cuenta de "${confirmDeactivate?.fullName}"? La cuenta y su verificación quedarán deshabilitadas. Podrá reactivarse luego.`}
      confirmLabel="Desactivar"
      variant="warning"
      onConfirm={() => {
        if (confirmDeactivate) {
          void handleToggleUserStatus(confirmDeactivate);
          setConfirmDeactivate(null);
        }
      }}
      isLoading={!!statusUpdatingId}
    />

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-normal">Nuevo usuario</DialogTitle>
          <DialogDescription>
            Registra una cuenta con correo institucional, contraseña inicial y rol del sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <FormField label="Email" error={errors.email}>
            <Input
              value={form.email}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, email: event.target.value }));
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="usuario@continental.edu.pe"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Nombre completo" error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, fullName: event.target.value }));
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="Nombres y apellidos"
              autoComplete="name"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Rol">
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value as UserAdmin["role"] }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/50"
              >
                <option value="ADMIN">Admin</option>
                <option value="COORDINATOR">Coordinador</option>
                <option value="TEACHER">Docente</option>
                <option value="STUDENT">Estudiante</option>
              </select>
            </FormField>

            <FormField label="Contraseña" error={errors.password}>
              <div className="relative">
                <Input
                  value={form.password}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, password: event.target.value }));
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            La contraseña debe incluir mayúscula, minúscula, número, carácter especial y no contener espacios.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-[#6B21A8]"
              />
              <span>
                <span className="block font-medium text-foreground">Usuario activo</span>
                <span className="block text-xs text-muted-foreground">Puede iniciar sesión si sus credenciales son válidas.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <input
                type="checkbox"
                checked={form.emailVerified}
                onChange={(event) => setForm((prev) => ({ ...prev, emailVerified: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-[#6B21A8]"
              />
              <span>
                <span className="block font-medium text-foreground">Email verificado</span>
                <span className="block text-xs text-muted-foreground">Marca la cuenta como verificada desde su creación.</span>
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="border-0 bg-transparent px-0 pb-0">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleCreateUser} disabled={submitting}>
            {submitting ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
