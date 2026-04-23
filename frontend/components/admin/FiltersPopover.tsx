"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import React from "react";

export type StatusFilter = "all" | "active" | "inactive";

interface FiltersPopoverProps {
  activeCount: number;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  onClear: () => void;
  extraFilters?: React.ReactNode;
}

/**
 * Panel lateral de filtros. Siempre incluye el filtro "Estado" y permite inyectar filtros
 * específicos por módulo vía {@link FiltersPopoverProps.extraFilters}.
 */
export function FiltersPopover({
  activeCount,
  statusFilter,
  onStatusChange,
  onClear,
  extraFilters,
}: FiltersPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(props) => (
          <Button
            {...props}
            variant="outline"
            className="h-9 gap-1.5 rounded-md border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] hover:bg-[#fafafa]"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#171717] px-1.5 text-[11px] font-medium text-white">
                {activeCount}
              </span>
            ) : null}
          </Button>
        )}
      />
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-6 p-6 sm:max-w-md"
      >
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#171717]">Filtros</h2>
            <p className="text-sm text-[#666666]">Refina la lista por criterios.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-[#666666] hover:text-[#171717]"
            onClick={() => {
              onClear();
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        </header>

        <section className="space-y-2">
          <label className="block text-sm font-medium text-[#171717]">Estado</label>
          <div className="flex gap-2">
            {(
              [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  statusFilter === opt.value
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#ebebeb] bg-white text-[#171717] hover:bg-[#fafafa]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {extraFilters ? <div className="space-y-4">{extraFilters}</div> : null}

        <div className="mt-auto flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="h-9 rounded-md bg-[#171717] px-4 text-sm text-white hover:bg-black"
          >
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
