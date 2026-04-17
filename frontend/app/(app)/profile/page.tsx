"use client";

import { useState } from "react";
import { UserCircle, Mail, Shield, Pencil, Check, X } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  admin:       { text: "#be185d", bg: "rgba(190,24,93,0.1)"   },
  coordinator: { text: "#0369a1", bg: "rgba(3,105,161,0.1)"   },
  teacher:     { text: "#047857", bg: "rgba(4,120,87,0.1)"    },
  student:     { text: "#6B21A8", bg: "rgba(107,33,168,0.1)"  },
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  const roleColor = ROLE_COLORS[user?.role ?? "student"];
  const initial   = (user?.name ?? "U").charAt(0).toUpperCase();

  function handleCancel() {
    setName(user?.name ?? "");
    setEditing(false);
  }

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#171717] dark:text-white">{t.profile.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {t.profile.description}
        </p>
      </div>

      {/* Card principal */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-white/8 shadow-sm overflow-hidden">

        {/* Banner + Avatar */}
        <div
          className="h-24 relative"
          style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
        />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div
              className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#1a1a1a] flex items-center justify-center text-white text-2xl font-bold shadow-md"
              style={{ background: "linear-gradient(135deg, #6B21A8 0%, #4C1278 100%)" }}
            >
              {initial}
            </div>
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="h-8 px-3 gap-1.5 text-gray-500 dark:text-gray-400 hover:text-[#6B21A8] hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="text-xs">{t.common.edit}</span>
              </Button>
            )}
          </div>

          {/* Nombre */}
          <div className="mb-4">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B21A8]/40"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => setEditing(false)}
                  className="h-9 px-3 bg-[#171717] dark:bg-white text-white dark:text-[#171717] hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-9 px-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-[#171717] dark:text-white">{name}</h2>
            )}
          </div>

          {/* Info fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  {t.profile.emailLabel}
                </p>
                <p className="text-sm text-[#171717] dark:text-gray-200 font-medium">
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  {t.profile.roleLabel}
                </p>
                <span
                  className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: roleColor.text, backgroundColor: roleColor.bg }}
                >
                  {t.common.roles[user?.role as keyof typeof t.common.roles] ?? user?.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
                <UserCircle className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  {t.profile.userIdLabel}
                </p>
                <p className="text-sm text-[#171717] dark:text-gray-200 font-medium font-mono">
                  {user?.id ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
