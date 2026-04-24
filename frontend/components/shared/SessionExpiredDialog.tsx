"use client";

import { Loader2, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import {
  closeExpiredSession,
  restoreSession,
  useSessionRecovery,
} from "@/lib/sessionRecovery";
import { toastError, toastSuccess } from "@/lib/utils";

export default function SessionExpiredDialog() {
  const { status } = useSessionRecovery();
  const open = status !== "idle";
  const restoring = status === "refreshing";

  async function handleRestore() {
    try {
      await restoreSession();
      toastSuccess("Sesión restaurada", "Puedes continuar trabajando.");
    } catch {
      toastError("Sesión expirada", "Vuelve a iniciar sesión para continuar.");
    }
  }

  async function handleLogout() {
    closeExpiredSession();
    try {
      await api.post("/api/auth/logout");
    } catch {
      // The local session is already closed; backend logout can fail if the access token expired.
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-normal">
            Sesión expirada
          </DialogTitle>
          <DialogDescription>
            Tu sesión venció por seguridad. Puedes restaurarla para continuar
            donde estabas o cerrar sesión para volver al inicio de sesión.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent px-0 pb-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={restoring}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
          <Button type="button" onClick={handleRestore} disabled={restoring}>
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Restaurar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
