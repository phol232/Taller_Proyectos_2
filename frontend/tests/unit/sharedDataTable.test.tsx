import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataTable, { type Column } from "@/components/shared/DataTable";
import { I18nProvider } from "@/lib/i18n";

interface Row {
  id: string;
  name: string;
  code: string;
}

const columns: Column<Row>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>>) {
  return render(
    <I18nProvider>
      <DataTable columns={columns} data={[]} {...props} />
    </I18nProvider>
  );
}

describe("DataTable (shared)", () => {
  it("muestra el esqueleto de carga cuando isLoading=true", () => {
    const { container } = renderTable({ isLoading: true });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renderiza encabezados y filas con los datos", () => {
    const data: Row[] = [{ id: "1", code: "A-101", name: "Aula 101" }];

    renderTable({ data });

    expect(screen.getByText("Código")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("A-101")).toBeInTheDocument();
    expect(screen.getByText("Aula 101")).toBeInTheDocument();
  });

  it("muestra el mensaje de sin registros cuando data está vacío", () => {
    renderTable({ data: [] });

    expect(screen.getByText(/sin registros|no records|no hay/i)).toBeInTheDocument();
  });
});
