"use client";

import { useCallback, useState } from "react";

/**
 * Hook de exportación con importación dinámica de jsPDF y xlsx.
 * RF-17 — las librerías se cargan en demanda para no inflar el bundle inicial.
 */
export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = useCallback(async (data: Record<string, unknown>[]) => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      autoTable(doc, {
        head: [Object.keys(data[0] ?? {})],
        body: data.map(Object.values),
      });
      doc.save("horario-planner-uc.pdf");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportToExcel = useCallback(async (data: Record<string, unknown>[], sheetName = "Horario") => {
    setIsExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(sheetName);
      const keys = Object.keys(data[0] ?? {});
      ws.addRow(keys);
      data.forEach((row) => ws.addRow(keys.map((k) => row[k])));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "horario-planner-uc.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, exportToExcel, isExporting };
}
