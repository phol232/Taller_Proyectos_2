"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Loader2, Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import api from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/utils";

export default function Navbar() {
  const [loggingOut, setLoggingOut] = useState(false);
  const { logout } = useAuthStore();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

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
      <div className="px-6 flex items-center justify-end h-14 gap-2">

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

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label={t.navbar.logoutLabel}
          className="h-8 px-2.5 text-gray-500 dark:text-gray-400 hover:text-[#171717] dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 gap-1.5 cursor-pointer"
        >
          {loggingOut
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <LogOut className="h-3.5 w-3.5" />}
          <span className="text-xs hidden sm:inline">{t.navbar.logout}</span>
        </Button>
      </div>
    </nav>
  );
}

