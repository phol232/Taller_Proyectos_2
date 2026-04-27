"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Sparkles,
  Users,
  GraduationCap,
  DoorOpen,
  CalendarCheck,
  Building2,
  Clock,
  UserCircle,
  LogOut,
  Settings,
  User,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { useTranslation } from "@/lib/i18n";
import type { Role } from "@/types/entities";
import type { TranslationDictionary } from "@/lib/i18n/types";
import api from "@/lib/api";
import { toastError, toastSuccess, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  exact?: boolean;
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
          { label: t.sidebar.nav.home, href: "/student", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)", exact: true },
          { label: t.sidebar.nav.mySchedule, href: "/student/my-schedule", icon: <CalendarDays className="h-4 w-4" />, color: "#0369a1", bgColor: "rgba(3,105,161,0.15)" },
          { label: t.sidebar.nav.viewSchedules, href: "/student/schedule/generate", icon: <BookOpen className="h-4 w-4" />, color: "#047857", bgColor: "rgba(4,120,87,0.15)" },
          { label: t.sidebar.nav.buildSchedule, href: "/student/schedule/builder", icon: <Sparkles className="h-4 w-4" />, color: "#b45309", bgColor: "rgba(180,83,9,0.15)" },
        ],
      },
    ],
    coordinator: [
      {
        items: [
          { label: t.sidebar.nav.home, href: "/coordinator", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)", exact: true },
        ],
      },
      {
        group: t.sidebar.nav.schedules,
        items: [
          { label: t.sidebar.nav.generate, href: "/coordinator/schedule/generate", icon: <CalendarCheck className="h-4 w-4" />, color: "#16a34a", bgColor: "rgba(22,163,74,0.15)" },
          { label: t.sidebar.nav.builder, href: "/coordinator/schedule/builder", icon: <Sparkles className="h-4 w-4" />, color: "#b45309", bgColor: "rgba(180,83,9,0.15)" },
          { label: t.sidebar.nav.confirmSchedule, href: "/coordinator/schedule/confirm", icon: <CalendarDays className="h-4 w-4" />, color: "#0369a1", bgColor: "rgba(3,105,161,0.15)" },
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
          { label: t.sidebar.nav.home, href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)", exact: true },
        ],
      },
    ],
    admin: [
      {
        items: [
          { label: t.sidebar.nav.home, href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)", exact: true },
        ],
      },
      {
        group: t.sidebar.nav.management,
        items: [
          { label: "Usuarios", href: "/admin/users", icon: <UserCircle className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
          { label: t.sidebar.nav.students, href: "/admin/students", icon: <Users className="h-4 w-4" />, color: "#0284c7", bgColor: "rgba(2,132,199,0.15)" },
          { label: t.sidebar.nav.courses, href: "/admin/courses", icon: <BookOpen className="h-4 w-4" />, color: "#b45309", bgColor: "rgba(180,83,9,0.15)" },
          { label: t.sidebar.nav.teachers, href: "/admin/teachers", icon: <GraduationCap className="h-4 w-4" />, color: "#0d9488", bgColor: "rgba(13,148,136,0.15)" },
          { label: t.sidebar.nav.classrooms, href: "/admin/classrooms", icon: <DoorOpen className="h-4 w-4" />, color: "#be185d", bgColor: "rgba(190,24,93,0.15)" },
          { label: "Facultades", href: "/admin/facultades", icon: <Building2 className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
          { label: "Períodos", href: "/admin/academic-periods", icon: <CalendarDays className="h-4 w-4" />, color: "#7c3aed", bgColor: "rgba(124,58,237,0.15)" },
        ],
      },
    ],
  };
}

export default function Sidebar() {
  const { role, user, logout } = useAuthStore();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((state) => state.closeMobileSidebar);
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    const syncViewport = () => {
      setIsDesktop(media.matches);
    };

    syncViewport();
    media.addEventListener("change", syncViewport);

    return () => {
      media.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) {
      closeMobileSidebar();
    }
  }, [isDesktop, closeMobileSidebar]);

  useEffect(() => {
    if (!isDesktop) {
      closeMobileSidebar();
    }
  }, [pathname, isDesktop, closeMobileSidebar]);

  useEffect(() => {
    if (isDesktop || !mobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileSidebar();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDesktop, mobileSidebarOpen, closeMobileSidebar]);

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
  const effectiveCollapsed = isDesktop ? collapsed : false;

  return (
    <>
      <div
        onClick={closeMobileSidebar}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,_rgba(107,33,168,0.14),_transparent_45%),rgba(15,23,42,0.42)] backdrop-blur-[3px] transition-opacity duration-300 lg:hidden",
          mobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        className={cn(
          "w-0 lg:shrink-0 lg:transition-[width] lg:duration-200 lg:ease-in-out",
          collapsed ? "lg:w-[60px]" : "lg:w-64"
        )}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[calc(100vw-1rem)] flex-col overflow-y-auto border-r border-gray-100 bg-white/98 backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/[0.08] dark:bg-[#111111]/96 lg:sticky lg:top-0 lg:z-40 lg:w-full lg:max-w-none lg:translate-x-0 lg:bg-white lg:backdrop-blur-0 lg:dark:bg-[#111111]",
            mobileSidebarOpen
              ? "translate-x-0 shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
              : "-translate-x-[calc(100%+1rem)]",
            effectiveCollapsed ? "lg:w-[60px]" : "lg:w-full"
          )}
        >
          <div
            className={cn(
              "flex items-center border-b border-gray-100 px-3 shrink-0 dark:border-white/[0.08]",
              effectiveCollapsed ? "h-14 justify-center" : "h-[84px] gap-4"
            )}
          >
            <div
              className={cn(
                "rounded-xl flex items-center justify-center shrink-0",
                effectiveCollapsed ? "w-8 h-8" : "w-[52px] h-[52px] shadow-[0_10px_24px_rgba(107,33,168,0.28)]"
              )}
              style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
            >
              <GraduationCap className={cn(effectiveCollapsed ? "h-4 w-4" : "h-6 w-6", "text-white")} />
            </div>
            {!effectiveCollapsed && (
              <div className="flex min-w-0 flex-col justify-center overflow-hidden leading-none">
                <span className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.2em] text-[#6d6b7d] dark:text-gray-400">
                  {t.sidebar.university}
                </span>
                <span className="mt-1 whitespace-nowrap text-[17px] font-semibold tracking-[-0.03em] text-[#171717] dark:text-white">
                  {t.sidebar.continental}
                </span>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.group && !effectiveCollapsed && (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {group.group}
                  </p>
                )}
                {group.group && effectiveCollapsed && gi > 0 && (
                  <div className="mx-1 mb-2 h-px bg-gray-100 dark:bg-white/[0.08]" />
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={effectiveCollapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center rounded-lg text-sm transition-all duration-150 cursor-pointer",
                          effectiveCollapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5",
                          active
                            ? "bg-[rgba(107,33,168,0.08)] dark:bg-[rgba(107,33,168,0.22)]"
                            : "hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                        )}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                          style={{
                            backgroundColor: active ? item.bgColor : "transparent",
                            color: item.color,
                          }}
                        >
                          {item.icon}
                        </div>
                        {!effectiveCollapsed && (
                          <span
                            className={cn(
                              "flex-1 font-medium",
                              active
                                ? "font-semibold text-[#6B21A8] dark:text-purple-300"
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

            <div>
              <div className="mx-1 mb-2 h-px bg-gray-100 dark:bg-white/[0.08]" />
              {!effectiveCollapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t.sidebar.nav.account ?? "Cuenta"}
                </p>
              )}
              <div className="space-y-0.5">
                {[
                  { label: t.sidebar.myProfile, href: "/profile", icon: <User className="h-4 w-4" />, color: "#6B21A8", bgColor: "rgba(107,33,168,0.15)" },
                  { label: t.sidebar.settings, href: "/settings", icon: <Settings className="h-4 w-4" />, color: "#475569", bgColor: "rgba(71,85,105,0.15)" },
                ].map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={effectiveCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-sm transition-all duration-150 cursor-pointer",
                        effectiveCollapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5",
                        active
                          ? "bg-[rgba(107,33,168,0.08)] dark:bg-[rgba(107,33,168,0.22)]"
                          : "hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                        style={{ backgroundColor: active ? item.bgColor : "transparent", color: item.color }}
                      >
                        {item.icon}
                      </div>
                      {!effectiveCollapsed && (
                        <span
                          className={cn(
                            "flex-1 font-medium",
                            active
                              ? "font-semibold text-[#6B21A8] dark:text-purple-300"
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
          </nav>

          <div className="shrink-0 border-t border-gray-100 p-2 dark:border-white/[0.08]">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer",
                  effectiveCollapsed ? "justify-center p-1.5" : "gap-3 px-2 py-2.5",
                  "hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                )}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white self-start"
                  style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user?.name ?? ""}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() ?? <UserCircle className="h-4 w-4" />
                  )}
                </div>
                {!effectiveCollapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block break-words whitespace-normal text-[11px] leading-6 font-semibold uppercase tracking-[0.02em] text-[#171717] dark:text-gray-100">
                      {user?.name ?? t.common.user}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-gray-400 dark:text-gray-500">
                      {t.common.roles[user?.role as keyof typeof t.common.roles] ?? user?.role}
                    </span>
                  </div>
                )}
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align={effectiveCollapsed ? "center" : "start"}
                sideOffset={8}
                className="w-52"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate text-xs font-normal text-gray-500">
                    {user?.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t.sidebar.help}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.sidebar.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </div>
    </>
  );
}
