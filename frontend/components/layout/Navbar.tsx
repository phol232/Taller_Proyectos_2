"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Bell, LogOut, Loader2, Sun, Moon, Globe, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useUiStore } from "@/store/ui.store";
import { useTranslation } from "@/lib/i18n";
import api from "@/lib/api";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuthStore();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const systemNotifications = useNotificationStore((state) => state.systemNotifications);
  const markAllNotificationsRead = useNotificationStore((state) => state.markAllNotificationsRead);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const sidebarLabel = mobileSidebarOpen
    ? t.sidebar.collapseMenu
    : collapsed
      ? t.sidebar.expandMenu
      : t.sidebar.collapseMenu;
  const unreadNotifications = systemNotifications.filter((notification) => !notification.read).length;
  const notifications = systemNotifications.map((notification) => {
    switch (notification.kind) {
      case "welcome":
        return {
          ...notification,
          title: t.navbar.notificationWelcomeTitle,
          description: t.navbar.notificationWelcomeDesc,
        };
      case "schedule":
        return {
          ...notification,
          title: t.navbar.notificationScheduleTitle,
          description: t.navbar.notificationScheduleDesc,
        };
      case "security":
        return {
          ...notification,
          title: t.navbar.notificationSecurityTitle,
          description: t.navbar.notificationSecurityDesc,
        };
    }
  });
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? "U";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      toastSuccess(t.common.sessionClosed, t.common.sessionClosedSuccess);
    } catch {
      toastError(t.common.sessionClosed, t.common.sessionClosedLocalLong);
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-[#111111]">
      <div className="px-6 flex items-center justify-between h-14 gap-3">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={sidebarLabel}
            className="h-9 w-9 rounded-xl border border-gray-200/80 bg-white p-0 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-[#171717] dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer"
          >
            {mobileSidebarOpen || !collapsed ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">

          {/* Language switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            aria-label={locale === "es" ? "Switch to English" : "Cambiar a Español"}
            className="h-8 gap-1.5 px-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{locale === "es" ? "EN" : "ES"}</span>
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={t.navbar.changeTheme}
            className="h-8 w-8 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer"
          >
            {resolvedTheme === "dark"
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
          </Button>

          <div className="w-px h-5 bg-gray-100 dark:bg-white/10" />

          <DropdownMenu onOpenChange={(open) => open && markAllNotificationsRead()}>
            <DropdownMenuTrigger
              aria-label={t.navbar.notifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#171717] dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#3b82f6] ring-2 ring-white dark:ring-[#111111]" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-80 rounded-3xl border border-black/5 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/10 dark:bg-[#151515]/95">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold text-[#171717] dark:text-white">
                  {t.navbar.notifications}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-1">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "rounded-2xl border px-3 py-3",
                      notification.read
                        ? "border-transparent bg-gray-50/90 dark:bg-white/[0.04]"
                        : "border-[#3b82f6]/10 bg-[#eff6ff] dark:border-[#3b82f6]/20 dark:bg-[#172554]/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        notification.read ? "bg-gray-300 dark:bg-gray-600" : "bg-[#3b82f6]"
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#171717] dark:text-white">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                    {t.navbar.noNotifications}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t.navbar.profileLabel}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-[#171717] bg-white text-base font-semibold text-gray-500 transition-transform hover:scale-[1.02] dark:border-white/80 dark:bg-[#1b1b1b] dark:text-gray-200 cursor-pointer"
            >
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user?.name ?? ""}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitial
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-72 rounded-3xl border border-black/5 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/10 dark:bg-[#151515]/95">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#171717] dark:text-white">
                      {user?.name ?? t.common.user}
                    </p>
                    <p className="truncate text-xs font-normal text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-2xl px-3 py-2.5 text-[15px] text-gray-700 dark:text-gray-200">
                <User className="mr-2 h-4 w-4" />
                {t.sidebar.myProfile}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={loggingOut}
                variant="destructive"
                className="rounded-2xl px-3 py-2.5 text-[15px]"
              >
                {loggingOut
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <LogOut className="mr-2 h-4 w-4" />}
                {t.sidebar.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

