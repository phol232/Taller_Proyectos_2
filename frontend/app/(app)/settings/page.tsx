"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  Shield,
  Laptop,
  Smartphone,
  MapPin,
  Clock,
  AlertTriangle,
  LogOut,
  Trash2,
} from "lucide-react";
import { cn, toastError, toastSuccess } from "@/lib/utils";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

type ConfirmAction =
  | { type: "revoke-one"; sessionId: string }
  | { type: "revoke-others" }
  | { type: "close-all" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDevice(ua: string | null): { label: string; icon: React.ReactNode } {
  if (!ua) return { label: "Dispositivo desconocido", icon: <Laptop className="h-4 w-4" /> };
  const lower = ua.toLowerCase();
  if (lower.includes("android") || lower.includes("iphone") || lower.includes("mobile")) {
    return { label: "Dispositivo móvil", icon: <Smartphone className="h-4 w-4" /> };
  }
  return { label: "Computadora", icon: <Laptop className="h-4 w-4" /> };
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "es" ? "es-PE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B21A8] disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-[#6B21A8]" : "bg-gray-200 dark:bg-white/15"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-1"
        )}
      />
    </button>
  );
}

function ThemeButton({ value, current, label, icon }: {
  value: string;
  current: string | undefined;
  label: string;
  icon: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const active = current === value;
  return (
    <button
      onClick={() => setTheme(value)}
      className={cn(
        "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
        active
          ? "border-[#6B21A8] bg-[#6B21A8]/8 text-[#6B21A8] dark:text-purple-300"
          : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const s = t.settings;

  // Notifications (local state only — backend not implemented yet)
  const [notifEmail, setNotifEmail]       = useState(true);
  const [notifSchedule, setNotifSchedule] = useState(true);

  // Sessions
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId]   = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [closingAll, setClosingAll]   = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await api.get<Session[]>("/api/auth/sessions");
      setSessions(data);
    } catch {
      // silent — user might not notice if sessions list fails
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function revokeSessionById(id: string) {
    setRevokingId(id);
    try {
      await api.delete(`/api/auth/sessions/${id}`);
      toastSuccess(s.revokeSessionSuccess);
      await loadSessions();
    } catch {
      toastError(s.revokeSessionError);
    } finally {
      setRevokingId(null);
    }
  }

  async function revokeAllOtherSessions() {
    setRevokingAll(true);
    // Cerrar todas menos la primera (la más reciente = sesión actual)
    const others = sessions.slice(1);
    try {
      await Promise.all(others.map(sess => api.delete(`/api/auth/sessions/${sess.id}`)));
      toastSuccess(s.revokeAllOtherSuccess);
      await loadSessions();
    } catch {
      toastError(s.revokeSessionError);
    } finally {
      setRevokingAll(false);
    }
  }

  async function closeAllSessions() {
    setClosingAll(true);
    try {
      await api.post("/api/auth/logout-all");
      toastSuccess(s.closeAllSessionsSuccess);
      logout();
      router.replace("/login");
    } catch {
      toastError(s.revokeSessionError);
    } finally {
      setClosingAll(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case "revoke-one":
        await revokeSessionById(confirmAction.sessionId);
        break;
      case "revoke-others":
        await revokeAllOtherSessions();
        break;
      case "close-all":
        await closeAllSessions();
        break;
    }

    setConfirmAction(null);
  }

  const confirmDialogConfig = confirmAction
    ? confirmAction.type === "revoke-one"
      ? {
          title: s.revokeSession,
          description: s.revokeSessionConfirm,
          confirmLabel: s.revokeSession,
          isLoading: revokingId === confirmAction.sessionId,
        }
      : confirmAction.type === "revoke-others"
        ? {
            title: s.revokeAllOther,
            description: s.revokeAllOtherConfirm,
            confirmLabel: s.revokeAllOther,
            isLoading: revokingAll,
          }
        : {
            title: s.closeAllSessions,
            description: s.closeAllSessionsConfirm,
            confirmLabel: s.revokeSession,
            isLoading: closingAll,
          }
    : null;

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#171717] dark:text-white tracking-[-0.32px] leading-tight">
          {s.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
      </div>

      <div className="space-y-4">

        {/* ── Apariencia ───────────────────────────────────────────── */}
        <SectionCard title={s.sectionAppearance}>
          <SettingRow label={s.theme}>
            <div className="flex gap-2">
              <ThemeButton value="light"  current={theme} label={s.themeLight}  icon={<Sun  className="h-4 w-4" />} />
              <ThemeButton value="dark"   current={theme} label={s.themeDark}   icon={<Moon className="h-4 w-4" />} />
              <ThemeButton value="system" current={theme} label={s.themeSystem} icon={<Monitor className="h-4 w-4" />} />
            </div>
          </SettingRow>
          <SettingRow label={s.language}>
            <div className="flex gap-2">
              {(["es", "en"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    locale === lang
                      ? "border-[#6B21A8] bg-[#6B21A8]/8 text-[#6B21A8] dark:text-purple-300"
                      : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {lang === "es" ? s.langEs : s.langEn}
                </button>
              ))}
            </div>
          </SettingRow>
        </SectionCard>

        {/* ── Notificaciones ───────────────────────────────────────── */}
        <SectionCard title={s.sectionNotifications}>
          <SettingRow label={s.notifEmail} description={s.notifEmailDesc}>
            <Toggle checked={notifEmail} onChange={setNotifEmail} />
          </SettingRow>
          <SettingRow label={s.notifScheduleChanges} description={s.notifScheduleChangesDesc}>
            <Toggle checked={notifSchedule} onChange={setNotifSchedule} />
          </SettingRow>
        </SectionCard>

        {/* ── Sesiones activas ─────────────────────────────────────── */}
        <SectionCard title={s.sectionSessions} description={s.sessionsDesc}>

          {/* Lista */}
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-gray-100 dark:bg-white/8" />
                    <div className="h-2.5 w-48 rounded bg-gray-50 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{s.noOtherSessions}</p>
          ) : (
            <div className="space-y-0">
              {sessions.map((sess, idx) => {
                const device = parseDevice(sess.userAgent);
                const isCurrent = idx === 0;
                return (
                  <div
                    key={sess.id}
                    className="flex items-start gap-3 py-3.5 border-b border-gray-50 dark:border-white/5 last:border-0"
                  >
                    {/* Device icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      isCurrent
                        ? "bg-[#6B21A8]/10 text-[#6B21A8] dark:text-purple-400"
                        : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400"
                    )}>
                      {device.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {device.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#6B21A8]/10 text-[#6B21A8] dark:text-purple-400">
                            {s.sessionCurrentDevice}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {sess.ipAddress && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {s.sessionIp}: {sess.ipAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                          <Clock className="h-3 w-3" />
                          {s.sessionCreated}: {formatDate(sess.createdAt, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Revoke */}
                    {!isCurrent && (
                      <button
                        onClick={() => setConfirmAction({ type: "revoke-one", sessionId: sess.id })}
                        disabled={revokingId === sess.id}
                        className="shrink-0 h-7 px-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-md hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 dark:hover:border-red-500/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revokingId === sess.id ? "..." : s.revokeSession}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cerrar otras sesiones */}
          {sessions.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/8">
              <button
                onClick={() => setConfirmAction({ type: "revoke-others" })}
                disabled={revokingAll}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {revokingAll ? "..." : s.revokeAllOther}
              </button>
            </div>
          )}
        </SectionCard>

        {/* ── Zona de peligro ──────────────────────────────────────── */}
        <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-white dark:bg-[#111111] overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 dark:border-red-500/10 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">{s.sectionDanger}</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{s.closeAllSessions}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.closeAllSessionsDesc}</p>
              </div>
              <button
                onClick={() => setConfirmAction({ type: "close-all" })}
                disabled={closingAll}
                className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {closingAll ? "..." : s.closeAllSessions}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 pt-2 pb-4">
          <Shield className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
          <p className="text-[11px] text-gray-400 dark:text-gray-600">
            Planner UC · {user?.email} · v1.0
          </p>
        </div>

        {confirmDialogConfig && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            onOpenChange={(open) => {
              if (!open) setConfirmAction(null);
            }}
            title={confirmDialogConfig.title}
            description={confirmDialogConfig.description}
            confirmLabel={confirmDialogConfig.confirmLabel}
            variant="destructive"
            isLoading={confirmDialogConfig.isLoading}
            onConfirm={handleConfirmAction}
          />
        )}

      </div>
    </div>
  );
}
