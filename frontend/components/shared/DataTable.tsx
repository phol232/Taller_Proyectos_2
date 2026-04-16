"use client";

// TODO Fase 1: Implementar tabla reutilizable con ordenamiento, búsqueda y paginación
// Basada en Table de shadcn/ui

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKeys?: (keyof T)[];
  isLoading?: boolean;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return <div className="animate-pulse h-40 rounded-lg bg-gray-50 card-border" />;
  }

  return (
    <div className="card-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left font-medium text-gray-600"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-vercel-black">
                  {String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          Sin registros
        </div>
      )}
    </div>
  );
}
