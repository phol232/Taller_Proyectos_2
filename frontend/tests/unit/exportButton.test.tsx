import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExportButton from "@/components/schedule/ExportButton";
import { I18nProvider } from "@/lib/i18n";

function renderButton() {
  return render(
    <I18nProvider>
      <ExportButton />
    </I18nProvider>
  );
}

describe("ExportButton", () => {
  it("renderiza el botón deshabilitado", () => {
    renderButton();

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Exportar — Fase 4");
  });
});
