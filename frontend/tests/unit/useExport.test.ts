import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExport } from "@/hooks/useExport";

const mocks = vi.hoisted(() => {
  const save = vi.fn();
  const autoTable = vi.fn();
  const addRow = vi.fn();
  const addWorksheet = vi.fn(() => ({ addRow }));
  const writeBuffer = vi.fn().mockResolvedValue(Buffer.from("xlsx-data"));
  const Workbook = vi.fn(function () {
    return { addWorksheet, xlsx: { writeBuffer } };
  });
  const jsPDF = vi.fn(function () {
    return { save };
  });
  return { save, autoTable, addRow, addWorksheet, writeBuffer, Workbook, jsPDF };
});

vi.mock("jspdf", () => ({ jsPDF: mocks.jsPDF }));
vi.mock("jspdf-autotable", () => ({ default: mocks.autoTable }));
vi.mock("exceljs", () => ({ Workbook: mocks.Workbook }));

describe("useExport", () => {
  const data = [
    { curso: "Matemáticas", aula: "A101" },
    { curso: "Física", aula: "A102" },
  ];

  beforeEach(() => {
    mocks.save.mockClear();
    mocks.autoTable.mockClear();
    mocks.Workbook.mockClear();
    mocks.addWorksheet.mockClear();
    mocks.addRow.mockClear();
    mocks.writeBuffer.mockClear();

    global.URL.createObjectURL = vi.fn(() => "blob:url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exportToPDF genera un PDF con los datos", async () => {
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportToPDF(data);
    });

    expect(mocks.autoTable).toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith("horario-planner-uc.pdf");
    expect(result.current.isExporting).toBe(false);
  });

  it("exportToExcel genera un archivo Excel con los datos", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportToExcel(data, "Horario 2025");
    });

    await waitFor(() => expect(result.current.isExporting).toBe(false));
    expect(mocks.Workbook).toHaveBeenCalled();
    expect(mocks.addWorksheet).toHaveBeenCalledWith("Horario 2025");
    expect(clickSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");

    clickSpy.mockRestore();
  });
});
