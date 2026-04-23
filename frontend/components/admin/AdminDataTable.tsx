"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface AdminColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
}

interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

export function AdminDataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyMessage = "Sin registros",
}: AdminDataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>(null);

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const column = columns.find((c) => c.key === sortKey);
    if (!column || !column.sortable) return data;
    const accessor = column.sortAccessor;
    const getValue = (row: T) => {
      if (accessor) return accessor(row);
      const val = (row as Record<string, unknown>)[column.key];
      return val as string | number | null | undefined;
    };
    const sorted = [...data].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "es", { sensitivity: "base", numeric: true });
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [data, columns, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") {
      setSortDir("desc");
      return;
    }
    if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    }
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-[#fafafa] shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px]" />;
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px]">
      <table className="w-full text-sm">
        <thead className="bg-white">
          <tr>
            {columns.map((column) => {
              const isSorted = column.sortable && sortKey === column.key;
              const Icon = !isSorted ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={column.key}
                  className="border-b border-[#ebebeb] px-4 py-3 text-left text-[12px] font-medium text-[#666666]"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#666666] transition-colors hover:text-[#171717]"
                    >
                      {column.label}
                      <Icon className={`h-3.5 w-3.5 ${isSorted ? "text-[#171717]" : "text-[#a0a0a0]"}`} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={getRowId(row)} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="border-t border-[#ebebeb] px-4 py-3 text-[#171717]">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-[#666666]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
