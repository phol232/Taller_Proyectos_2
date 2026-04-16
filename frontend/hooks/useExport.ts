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
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, "horario-planner-uc.xlsx");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, exportToExcel, isExporting };
}
