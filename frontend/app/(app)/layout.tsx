"use client";

import { SWRConfig } from "swr";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import RoleGuard from "@/components/shared/RoleGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Config global de SWR: deduplica ráfagas de la misma petición y evita
    // re-fetch al volver el foco. La frescura en tiempo real la dan los eventos
    // SSE (useAdminEvents), no el revalidado por foco.
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        revalidateOnFocus: false,
        revalidateIfStale: false,
        keepPreviousData: true,
      }}
    >
      <RoleGuard allowedRoles={["admin", "coordinator", "teacher", "student"]}>
        {/* Sidebar ocupa altura completa a la izquierda */}
        <div className="flex min-h-screen">
          <Sidebar />
          {/* Columna derecha: topbar + contenido */}
          <div className="flex flex-col flex-1 min-w-0">
            <Navbar />
            <main className="flex-1 flex flex-col bg-gray-50/60 dark:bg-[#0a0a0a]">
              {children}
            </main>
          </div>
        </div>
      </RoleGuard>
    </SWRConfig>
  );
}

