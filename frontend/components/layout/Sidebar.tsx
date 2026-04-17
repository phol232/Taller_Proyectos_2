"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Sparkles,
  Users,
  GraduationCap,
  DoorOpen,
  CalendarCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/entities";
import type { TranslationDictionary } from "@/lib/i18n/types";

interface NavItem {
  label:   string;
  href:    string;
  icon:    React.ReactNode;
  color:   string;
  bgColor: string;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

function getNavGroups(t: TranslationDictionary): Record<Role, NavGroup[]> {
  return {
    student: [
      {
        items: [
          { label: t.sidebar.nav.home,          href: "/student",                   icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
          { label: t.sidebar.nav.mySchedule,    href: "/student/my-schedule",       icon: <CalendarDays className="h-4 w-4" />,    color: "#0369a1", bgColor: "rgba(3,105,161,0.15)"  },
          { label: t.sidebar.nav.viewSchedules, href: "/student/schedule/generate", icon: <BookOpen className="h-4 w-4" />,        color: "#047857", bgColor: "rgba(4,120,87,0.15)"   },
          { label: t.sidebar.nav.buildSchedule, href: "/student/schedule/builder",  icon: <Sparkles className="h-4 w-4" />,        color: "#b45309", bgColor: "rgba(180,83,9,0.15)"   },
        ],
      },
    ],
    coordinator: [
      {
        items: [
          { label: t.sidebar.nav.home, href: "/coordinator", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
        ],
      },
      {
        group: t.sidebar.nav.schedules,
        items: [
          { label: t.sidebar.nav.generate,         href: "/coordinator/schedule/generate", icon: <CalendarCheck className="h-4 w-4" />, color: "#16a34a", bgColor: "rgba(22,163,74,0.15)"   },
          { label: t.sidebar.nav.builder,           href: "/coordinator/schedule/builder",  icon: <Sparkles className="h-4 w-4" />,      color: "#b45309", bgColor: "rgba(180,83,9,0.15)"   },
          { label: t.sidebar.nav.confirmSchedule,   href: "/coordinator/schedule/confirm",  icon: <CalendarDays className="h-4 w-4" />,  color: "#0369a1", bgColor: "rgba(3,105,161,0.15)"  },
        ],
      },
      {
        group: t.sidebar.nav.resources,
        items: [
          { label: t.sidebar.nav.availability, href: "/coordinator/teacher-availability", icon: <Clock className="h-4 w-4" />, color: "#c2410c", bgColor: "rgba(194,65,12,0.15)" },
        ],
      },
    ],
    teacher: [
      {
        items: [
          { label: t.sidebar.nav.home, href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
        ],
      },
    ],
    admin: [
      {
        items: [
          { label: t.sidebar.nav.home, href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
        ],
      },
      {
        group: t.sidebar.nav.management,
        items: [
          { label: t.sidebar.nav.students,   href: "/admin/students",   icon: <Users className="h-4 w-4" />,          color: "#0284c7", bgColor: "rgba(2,132,199,0.15)"   },
          { label: t.sidebar.nav.teachers,   href: "/admin/teachers",   icon: <GraduationCap className="h-4 w-4" />,  color: "#0d9488", bgColor: "rgba(13,148,136,0.15)"  },
          { label: t.sidebar.nav.courses,    href: "/admin/courses",    icon: <BookOpen className="h-4 w-4" />,        color: "#b45309", bgColor: "rgba(180,83,9,0.15)"   },
          { label: t.sidebar.nav.classrooms, href: "/admin/classrooms", icon: <DoorOpen className="h-4 w-4" />,        color: "#be185d", bgColor: "rgba(190,24,93,0.15)"  },
        ],
      },
    ],
  };
}

export default function Sidebar() {
  const { role, user, logout } = useAuthStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
      toastSuccess(t.common.sessionClosed, t.common.sessionClosedSuccess);
    } catch {
      toastError(t.common.sessionClosed, t.common.sessionClosedLocal);
    } finally {
      logout();
      router.replace("/login");
    }
  }

  if (!role) return null;

  const groups = getNavGroups(t)[role] ?? [];
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <div
      className={cn(
        "relative shrink-0 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-56"
      )}
    >
      {/* ── Botón flotante en el borde ── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? t.sidebar.expandMenu : t.sidebar.collapseMenu}
        className={cn(
          "absolute top-[18px] -right-3.5 w-7 h-7 rounded-lg flex items-center justify-center z-50 transition-all duration-200 cursor-pointer",
          "bg-gradient-to-br from-[#6B21A8] to-[#4C1278] text-white shadow-lg shadow-purple-500/25",
          "hover:shadow-purple-500/40 hover:scale-110 active:scale-95"
        )}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <aside className="border-r border-gray-100 dark:border-white/8 bg-white dark:bg-[#111111] flex flex-col sticky top-0 h-screen overflow-y-auto z-40 w-full">

        {/* ── Header: UC Branding ── */}
        <div
          className={cn(
            "flex items-center border-b border-gray-100 dark:border-white/8 px-3 shrink-0",
            collapsed ? "h-14 justify-center" : "h-[68px] gap-3"
          )}
        >
          <div
            className={cn(
              "rounded-xl flex items-center justify-center shrink-0",
              collapsed ? "w-8 h-8" : "w-10 h-10"
            )}
            style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
          >
            <GraduationCap className={cn(collapsed ? "h-4 w-4" : "h-5 w-5", "text-white")} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-sm font-bold text-[#171717] dark:text-white tracking-tight whitespace-nowrap">
                {t.sidebar.university}
              </span>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: "#6B21A8" }}>
                {t.sidebar.continental}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 tracking-wide whitespace-nowrap mt-0.5">
                {t.sidebar.brandSubtitle}
              </span>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.group && !collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-1.5">
                  {group.group}
                </p>
              )}
              {group.group && collapsed && gi > 0 && (
                <div className="h-px bg-gray-100 dark:bg-white/8 mx-1 mb-2" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-sm transition-all duration-150 cursor-pointer",
                        collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5",
                        active
                          ? "bg-[#171717] dark:bg-white/10"
                          : "hover:bg-gray-100 dark:hover:bg-white/6"
                      )}
                    >
                      {/* Icon — siempre con su color */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          backgroundColor: active ? item.bgColor : "transparent",
                          color: item.color,
                        }}
                      >
                        {item.icon}
                      </div>
                      {/* Label */}
                      {!collapsed && (
                        <span
                          className={cn(
                            "flex-1 font-medium",
                            active
                              ? "text-white dark:text-white"
                              : "text-gray-600 dark:text-gray-400"
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer: Perfil + Logout ── */}
        <div className="shrink-0 border-t border-gray-100 dark:border-white/8 p-2 space-y-1">
          {/* Perfil */}
          <Link
            href="/profile"
            title={collapsed ? t.sidebar.myProfile : undefined}
            className={cn(
              "flex items-center rounded-lg transition-all duration-150 cursor-pointer",
              collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-2",
              profileActive
                ? "bg-[#171717] dark:bg-white/10"
                : "hover:bg-gray-100 dark:hover:bg-white/6"
            )}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
            >
              {user?.name?.charAt(0).toUpperCase() ?? <UserCircle className="h-4 w-4" />}
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-snug flex-1 min-w-0">
                <span
                  className={cn(
                    "text-xs font-semibold break-words whitespace-normal",
                    profileActive ? "text-white dark:text-white" : "text-[#171717] dark:text-gray-100"
                  )}
                >
                  {user?.name ?? t.common.user}
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    profileActive ? "text-gray-300 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {t.common.roles[user?.role as keyof typeof t.common.roles] ?? user?.role}
                </span>
              </div>
            )}
          </Link>

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            title={collapsed ? t.sidebar.logout : undefined}
            className={cn(
              "w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400",
              collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5"
            )}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="text-xs font-medium">{t.sidebar.logout}</span>
            )}
          </button>
        </div>

      </aside>
    </div>
  );
}
