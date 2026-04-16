"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/entities";

const ROLE_HOME: Record<Role, string> = {
  student:     "/student",
  coordinator: "/coordinator",
  teacher:     "/dashboard",   // placeholder hasta Fase 2
  admin:       "/admin",       // placeholder hasta Fase 2
};

export default function DashboardPage() {
  const { role } = useAuthStore();
  const router   = useRouter();

  useEffect(() => {
    if (role && ROLE_HOME[role] !== "/dashboard") {
      router.replace(ROLE_HOME[role]);
    }
  }, [role, router]);

  return null;
}

