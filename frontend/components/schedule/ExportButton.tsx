"use client";

// TODO Fase 4: Exportación a PDF y Excel con importación dinámica — RF-17
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export default function ExportButton() {
  const { t } = useTranslation();
  return (
    <Button variant="outline" disabled className="text-sm">
      {t.exportButton}
    </Button>
  );
}
