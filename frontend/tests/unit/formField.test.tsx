import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "@/components/shared/FormField";

describe("FormField", () => {
  it("renderiza el label y el contenido", () => {
    render(
      <FormField label="Código">
        <input name="code" />
      </FormField>
    );

    expect(screen.getByText("Código")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("muestra la descripción cuando se provee", () => {
    render(
      <FormField label="Código" description="Texto de ayuda">
        <input />
      </FormField>
    );

    expect(screen.getByText("Texto de ayuda")).toBeInTheDocument();
  });

  it("muestra el mensaje de error y marca aria-invalid en inputs nativos", () => {
    render(
      <FormField label="Código" error="Campo obligatorio">
        <input data-testid="campo" />
      </FormField>
    );

    expect(screen.getByText("Campo obligatorio")).toBeInTheDocument();
    expect(screen.getByTestId("campo")).toHaveAttribute("aria-invalid", "true");
  });

  it("no clona props en elementos que no son input/select/textarea", () => {
    render(
      <FormField label="Código" error="Campo obligatorio">
        <div data-testid="wrapper">contenido</div>
      </FormField>
    );

    expect(screen.getByTestId("wrapper")).not.toHaveAttribute("aria-invalid");
  });

  it("renderiza labelRight cuando se provee", () => {
    render(
      <FormField label="Código" labelRight={<span>extra</span>}>
        <input />
      </FormField>
    );

    expect(screen.getByText("extra")).toBeInTheDocument();
  });
});
