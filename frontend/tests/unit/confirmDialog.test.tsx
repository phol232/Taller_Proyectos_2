import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { I18nProvider } from "@/lib/i18n";

function renderDialog(props: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  render(
    <I18nProvider>
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Título de prueba"
        description="Descripción de prueba"
        onConfirm={onConfirm}
        {...props}
      />
    </I18nProvider>,
  );

  return { onOpenChange, onConfirm };
}

describe("ConfirmDialog", () => {
  it("ejecuta onConfirm al pulsar el botón principal", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog({ confirmLabel: "Aceptar" });

    await user.click(screen.getByRole("button", { name: /aceptar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cierra el diálogo al cancelar", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra estado de carga y deshabilita acciones", () => {
    renderDialog({ isLoading: true, confirmLabel: "Guardar" });

    expect(screen.getByRole("button", { name: /procesando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });
});
