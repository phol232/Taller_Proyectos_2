import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectField } from "@/components/admin/SelectField";

describe("SelectField", () => {
  it("renderiza opciones y notifica cambios", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectField
        value=""
        onChange={onChange}
        placeholder="Selecciona"
        options={[
          { value: "a", label: "Opción A" },
          { value: "b", label: "Opción B" },
        ]}
      />,
    );

    expect(screen.getByText("Selecciona")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Opción B" });
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("respeta estado deshabilitado", () => {
    render(
      <SelectField
        value="a"
        onChange={vi.fn()}
        disabled
        options={[{ value: "a", label: "Opción A" }]}
      />,
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
