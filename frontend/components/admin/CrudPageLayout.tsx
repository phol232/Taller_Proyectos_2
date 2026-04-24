"use client";

import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { AdminDataTable, type AdminColumn } from "@/components/admin/AdminDataTable";
import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";
import React from "react";

interface CrudPageLayoutProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: AdminColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  dialogTitle: string;
  dialogDescription: string;
  onCreate: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
  /** Componente de filtros (ej. {@link FiltersPopover}) posicionado a la izquierda del toolbar. */
  filters?: React.ReactNode;
  /** Clase extra para ajustar el ancho del DialogContent / SheetContent. */
  dialogContentClassName?: string;
  /** Cuando true, usa un Slide-over Panel lateral en vez del Dialog centrado. */
  useSheet?: boolean;
  /** Total de registros (para paginación). */
  totalCount?: number;
  /** Página actual (1-based). */
  page?: number;
  /** Total de páginas. */
  totalPages?: number;
  /** Callback al cambiar de página. */
  onPageChange?: (page: number) => void;
}

export function CrudPageLayout<T>({
  title,
  description,
  data,
  columns,
  getRowId,
  isLoading = false,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  dialogOpen,
  onDialogOpenChange,
  dialogTitle,
  dialogDescription,
  onCreate,
  onSubmit,
  isSubmitting = false,
  children,
  filters,
  dialogContentClassName,
  useSheet = false,
  totalCount,
  page,
  totalPages,
  onPageChange,
}: CrudPageLayoutProps<T>) {
  return (
    <PageShell
      title={title}
      description={description}
      actions={
        <Button
          onClick={onCreate}
          className="h-10 rounded-md bg-[#6B21A8] px-4 text-white hover:bg-[#581C87]"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      }
    >
      <Card className="overflow-hidden rounded-lg bg-white shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px]">
        <div className="flex flex-col gap-3 border-b border-[#ebebeb] bg-white px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-shrink-0 sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808080]" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Búsqueda"
            />
          </div>
          {filters}
          <div className="ml-auto text-xs text-[#666666]">
            {totalCount ?? data.length} {(totalCount ?? data.length) === 1 ? "registro" : "registros"}
          </div>
        </div>
        <CardContent className="p-4">
          <AdminDataTable
            columns={columns}
            data={data}
            getRowId={getRowId}
            isLoading={isLoading}
          />
        </CardContent>
        {totalPages !== undefined && totalPages > 1 && onPageChange && (
          <div className="flex items-center justify-between border-t border-[#ebebeb] px-4 py-3 text-sm">
            <span className="text-[#666666]">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange((page ?? 1) - 1)}
                disabled={(page ?? 1) <= 1}
                className="rounded border border-[#ebebeb] px-3 py-1 text-xs disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => onPageChange((page ?? 1) + 1)}
                disabled={(page ?? 1) >= totalPages}
                className="rounded border border-[#ebebeb] px-3 py-1 text-xs disabled:opacity-40 hover:bg-[#f5f5f5] transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {useSheet ? (
        <Sheet open={dialogOpen} onOpenChange={onDialogOpenChange}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className={cn(
              "flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[calc(100vw-3rem)] data-[side=right]:sm:max-w-none",
              dialogContentClassName
            )}
          >
            <SheetHeader className="flex flex-row items-start justify-between border-b border-[#ebebeb] px-6 py-5 gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <SheetTitle className="text-base font-semibold text-[#171717]">{dialogTitle}</SheetTitle>
                <SheetDescription className="text-sm text-[#666]">{dialogDescription}</SheetDescription>
              </div>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => onDialogOpenChange(false)}
                className="mt-0.5 shrink-0 rounded-md p-1.5 text-[#808080] transition hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B21A8]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            <SheetFooter className="flex flex-row justify-end gap-3 border-t border-[#ebebeb] px-6 py-4">
              <Button
                variant="outline"
                onClick={() => onDialogOpenChange(false)}
                className="h-9 rounded-md border border-[#ebebeb] bg-white px-4 text-sm text-[#171717] hover:bg-[#fafafa]"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="h-9 rounded-md bg-[#6B21A8] px-4 text-sm text-white hover:bg-[#581C87]"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
          <DialogContent className={cn("gap-0 overflow-hidden p-0 sm:max-w-[55rem]", dialogContentClassName)}>
            <DialogHeader className="border-b border-[#ebebeb] px-6 py-5">
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[77vh] overflow-y-auto px-6 py-5">{children}</div>
            <DialogFooter className="px-6 py-4">
              <Button
                variant="outline"
                onClick={() => onDialogOpenChange(false)}
                className="h-9 rounded-md border border-[#ebebeb] bg-white px-4 text-sm text-[#171717] hover:bg-[#fafafa]"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="h-9 rounded-md bg-[#6B21A8] px-4 text-sm text-white hover:bg-[#581C87]"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
