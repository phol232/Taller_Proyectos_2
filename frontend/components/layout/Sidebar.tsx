"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/entities";

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  student: [
    { label: "Inicio",          href: "/student",                         icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Mi Horario",      href: "/student/my-schedule",             icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Ver Horarios",    href: "/student/schedule/generate",       icon: <BookOpen className="h-4 w-4" /> },
    { label: "Armar Horario",   href: "/student/schedule/builder",        icon: <Sparkles className="h-4 w-4" /> },
  ],
  coordinator: [
    { label: "Inicio",          href: "/coordinator",                     icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
  teacher: [
    { label: "Inicio",          href: "/dashboard",                       icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
  admin: [
    { label: "Inicio",          href: "/admin",                           icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
};

export default function Sidebar() {
  const { role } = useAuthStore();
  const pathname  = usePathname();

  if (!role) return null;

  const items = NAV_ITEMS[role] ?? [];

  return (
    <aside className="w-52 shrink-0 border-r border-gray-100 min-h-[calc(100vh-3.5rem)] bg-pure-white">
      <nav className="p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 mb-2 mt-1">
          Menú
        </p>

        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer",
                active
                  ? "bg-gray-100 text-vercel-black font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-vercel-black"
              )}
            >
              <span className={cn(active ? "text-vercel-black" : "text-gray-400")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

