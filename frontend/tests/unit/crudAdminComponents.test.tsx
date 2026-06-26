import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";

type Row = { id: string; name: string; code: string };

const rows: Row[] = [
  { id: "1", name: "Zeta", code: "Z-01" },
  { id: "2", name: "Alpha", code: "A-01" },
];

describe("AdminDataTable", () => {
  it("renderiza filas y permite ordenar columnas", async () => {
    const user = userEvent.setup();
    render(
      <AdminDataTable
        columns={[
          { key: "code", label: "Código", render: (row) => row.code, sortable: true },
          { key: "name", label: "Nombre", render: (row) => row.name, sortable: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getByText("Z-01")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /nombre/i }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Alpha");
  });
});

describe("CrudPageLayout", () => {
  const baseProps = {
    title: "Cursos",
    description: "Gestión de cursos",
    data: rows,
    columns: [{ key: "code", label: "Código", render: (row: Row) => row.code }],
    getRowId: (row: Row) => row.id,
    searchValue: "",
    onSearchChange: vi.fn(),
    searchPlaceholder: "Buscar curso",
    dialogOpen: false,
    onDialogOpenChange: vi.fn(),
    dialogTitle: "Nuevo curso",
    dialogDescription: "Completa los datos",
    onCreate: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("muestra toolbar, búsqueda y tabla", () => {
    render(
      <CrudPageLayout {...baseProps}>
        <div>Formulario</div>
      </CrudPageLayout>,
    );

    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar curso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
    expect(screen.getByText("A-01")).toBeInTheDocument();
    expect(screen.getByText("2 registros")).toBeInTheDocument();
  });

  it("notifica cambios de búsqueda y abre el formulario", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onCreate = vi.fn();

    render(
      <CrudPageLayout {...baseProps} onSearchChange={onSearchChange} onCreate={onCreate}>
        <div>Formulario</div>
      </CrudPageLayout>,
    );

    await user.type(screen.getByLabelText("Búsqueda"), "alpha");
    expect(onSearchChange).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /nuevo/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("muestra paginación y permite avanzar de página", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <CrudPageLayout
        {...baseProps}
        totalCount={40}
        page={1}
        totalPages={4}
        onPageChange={onPageChange}
      >
        <div>Formulario</div>
      </CrudPageLayout>,
    );

    expect(screen.getByText(/página 1 de 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renderiza el diálogo modal y envía el formulario", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onDialogOpenChange = vi.fn();

    render(
      <CrudPageLayout
        {...baseProps}
        dialogOpen
        onDialogOpenChange={onDialogOpenChange}
        onSubmit={onSubmit}
      >
        <div>Formulario modal</div>
      </CrudPageLayout>,
    );

    expect(screen.getByText("Formulario modal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));
    expect(onSubmit).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onDialogOpenChange).toHaveBeenCalledWith(false);
  });

  it("usa panel lateral cuando useSheet está activo", async () => {
    const user = userEvent.setup();
    const onDialogOpenChange = vi.fn();

    render(
      <CrudPageLayout
        {...baseProps}
        useSheet
        dialogOpen
        onDialogOpenChange={onDialogOpenChange}
        filters={<div>Filtros extra</div>}
        totalCount={1}
      >
        <div>Formulario lateral</div>
      </CrudPageLayout>,
    );

    expect(screen.getByText("Filtros extra")).toBeInTheDocument();
    expect(screen.getByText("1 registro")).toBeInTheDocument();
    expect(screen.getByText("Formulario lateral")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cerrar panel/i }));
    expect(onDialogOpenChange).toHaveBeenCalledWith(false);
  });
});
