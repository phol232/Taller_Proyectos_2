"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import RoleGuard from "@/components/shared/RoleGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["admin", "coordinator", "teacher", "student"]}>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex flex-col bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

