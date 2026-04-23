"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Mail, Shield, Pencil, Save, X, CreditCard, Phone, User2, CalendarDays, GraduationCap, BookOpen } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import { profileApi } from "@/lib/profileApi";
import { adminApi } from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import type { SexType } from "@/types/entities";
import type { FacultadAdmin, CarreraAdmin } from "@/types/admin";

const UC_PURPLE = "#6B21A8";

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  admin:       { text: "#be185d", bg: "rgba(190,24,93,0.10)"  },
  coordinator: { text: "#0369a1", bg: "rgba(3,105,161,0.10)"  },
  teacher:     { text: "#047857", bg: "rgba(4,120,87,0.10)"   },
  student:     { text: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
};

type SexOption = SexType | "";

interface ProfileForm {
  dni: string;
  phone: string;
  sex: SexOption;
  age: string;
  facultadId: string;
  carreraId: string;
}

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </label>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm]   = useState<ProfileForm>({ dni: "", phone: "", sex: "", age: "", facultadId: "", carreraId: "" });
  const [saved, setSaved] = useState<ProfileForm>({ dni: "", phone: "", sex: "", age: "", facultadId: "", carreraId: "" });

  const [facultades, setFacultades] = useState<FacultadAdmin[]>([]);
  const [carreras, setCarreras] = useState<CarreraAdmin[]>([]);
  const [carrerasLoading, setCarrerasLoading] = useState(false);

  const isStudent = user?.role === "student" || user?.role === "admin";

  const roleColor = ROLE_COLORS[user?.role ?? "student"];
  const initial   = (user?.name ?? "U").charAt(0).toUpperCase();

  useEffect(() => {
    profileApi.getMe()
      .then(data => {
        const loaded: ProfileForm = {
          dni:   data.dni   ?? "",
          phone: data.phone ?? "",
          sex:   (data.sex as SexOption) ?? "",
          age:   data.age != null ? String(data.age) : "",
          facultadId: data.facultadId ?? "",
          carreraId:  data.carreraId  ?? "",
        };
        setForm(loaded);
        setSaved(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Carga catálogo de facultades cuando el usuario es estudiante.
  useEffect(() => {
    if (!isStudent) return;
    adminApi.listCatalogFacultades()
      .then(setFacultades)
      .catch(() => {});
  }, [isStudent]);

  // Carga carreras filtradas por facultad seleccionada.
  useEffect(() => {
    if (!isStudent) return;
    if (!form.facultadId) {
      setCarreras([]);
      return;
    }
    setCarrerasLoading(true);
    adminApi.listCatalogCarreras(form.facultadId)
      .then(setCarreras)
      .catch(() => setCarreras([]))
      .finally(() => setCarrerasLoading(false));
  }, [isStudent, form.facultadId]);

  function handleEdit()   { setSaved({ ...form }); setEditing(true);  }
  function handleCancel() { setForm({ ...saved }); setEditing(false); }

  function validateForm(): boolean {
    if (form.dni && !/^[0-9]{8}$/.test(form.dni)) {
      toastError("DNI inválido", "El DNI debe tener exactamente 8 dígitos.");
      return false;
    }
    if (form.phone && !/^9[0-9]{8}$/.test(form.phone)) {
      toastError("Teléfono inválido", "El teléfono peruano debe empezar por 9 y tener 9 dígitos.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const data = await profileApi.upsertMe({
        dni:   form.dni.trim()   || null,
        phone: form.phone.trim() || null,
        sex:   (form.sex as SexType) || null,
        age:   form.age !== "" ? Number(form.age) : null,
        facultadId: form.facultadId || null,
        carreraId:  form.carreraId  || null,
      });
      const updated: ProfileForm = {
        dni:   data.dni   ?? "",
        phone: data.phone ?? "",
        sex:   (data.sex as SexOption) ?? "",
        age:   data.age != null ? String(data.age) : "",
        facultadId: data.facultadId ?? "",
        carreraId:  data.carreraId  ?? "",
      };
      setForm(updated);
      setSaved(updated);
      setEditing(false);
      toastSuccess("Perfil actualizado");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: string; errors?: Record<string, string> } } };
      const apiData  = axiosErr?.response?.data;
      if (apiData?.code === "DUPLICATE_PROFILE_FIELD" && apiData.errors) {
        toastError("Dato ya registrado", Object.values(apiData.errors).join(" "));
      } else if (apiData?.code === "VALIDATION_ERROR" && apiData.errors) {
        toastError("Datos inválidos", Object.values(apiData.errors).join(" "));
      }
    } finally {
      setSaving(false);
    }
  }

  function set(field: keyof ProfileForm) {
    return (v: string) => {
      if (field === "dni")   v = v.replace(/\D/g, "").slice(0, 8);
      if (field === "phone") v = v.replace(/\D/g, "").slice(0, 9);
      setForm(prev => ({ ...prev, [field]: v }));
    };
  }

  const sexOptions: { value: SexOption; label: string }[] = [
    { value: "",                  label: "—" },
    { value: "MALE",              label: t.profile.sexMale },
    { value: "FEMALE",            label: t.profile.sexFemale },
    { value: "OTHER",             label: t.profile.sexOther },
    { value: "PREFER_NOT_TO_SAY", label: t.profile.sexPreferNotToSay },
  ];

  // ─── Skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full animate-pulse">
        <div className="h-7 w-28 rounded-md bg-gray-200 dark:bg-white/10 mb-2" />
        <div className="h-4 w-52 rounded-md bg-gray-100 dark:bg-white/6 mb-8" />
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-4 border-b border-gray-100 dark:border-white/8">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/6" />
            </div>
          </div>
          {[1, 2].map(s => (
            <div key={s} className="px-6 py-5 border-b border-gray-100 dark:border-white/8 last:border-b-0">
              <div className="h-3 w-32 rounded bg-gray-100 dark:bg-white/6 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 rounded-lg bg-gray-100 dark:bg-white/6" />
                <div className="h-12 rounded-lg bg-gray-100 dark:bg-white/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Page ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t.profile.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.profile.description}</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden shadow-sm">

        {/* Card header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-white/8">
          <div
            className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-white select-none"
            style={{ background: UC_PURPLE }}
          >
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user?.name ?? ""}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            ) : initial}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-snug">
              {user?.name ?? "—"}
            </p>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1"
              style={{ color: roleColor.text, background: roleColor.bg }}
            >
              <Shield className="h-2.5 w-2.5" />
              {t.common.roles[user?.role as keyof typeof t.common.roles] ?? user?.role}
            </span>
          </div>

          {!editing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 dark:border-white/12 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t.profile.editProfile}
            </button>
          )}
        </div>

        {/* Section: Información de cuenta */}
        <div className="px-6 pt-5 pb-6 border-b border-gray-100 dark:border-white/8">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            {t.profile.sectionAccount}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={User2}>{t.profile.fullNameLabel}</FieldLabel>
              <Input value={user?.name ?? "—"} readOnly disabled />
            </div>
            <div>
              <FieldLabel icon={Mail}>{t.profile.emailLabel}</FieldLabel>
              <Input value={user?.email ?? "—"} readOnly disabled />
            </div>
          </div>
        </div>

        {/* Section: Datos personales */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            {t.profile.sectionPersonal}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={CreditCard}>{t.profile.dniLabel}</FieldLabel>
              <Input
                value={form.dni}
                onChange={e => set("dni")(e.target.value)}
                placeholder={t.profile.dniPlaceholder}
                inputMode="numeric"
                maxLength={8}
                disabled={!editing}
              />
            </div>
            <div>
              <FieldLabel icon={Phone}>{t.profile.phoneLabel}</FieldLabel>
              <Input
                value={form.phone}
                onChange={e => set("phone")(e.target.value)}
                placeholder={t.profile.phonePlaceholder}
                inputMode="numeric"
                maxLength={9}
                disabled={!editing}
              />
            </div>
            <div>
              <FieldLabel icon={User2}>{t.profile.sexLabel}</FieldLabel>
              <select
                value={form.sex}
                onChange={e => set("sex")(e.target.value as SexOption)}
                disabled={!editing}
                className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-gray-900 dark:text-white dark:bg-input/30 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:bg-input/50 dark:disabled:bg-input/80 appearance-none cursor-pointer disabled:cursor-not-allowed"
              >
                {sexOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="dark:bg-[#111]">{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel icon={CalendarDays}>{t.profile.ageLabel}</FieldLabel>
              <Input
                value={form.age}
                onChange={e => set("age")(e.target.value)}
                placeholder={t.profile.agePlaceholder}
                type="number"
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Section: Información académica (solo estudiantes) */}
        {isStudent && (
          <div className="px-6 pt-5 pb-6 border-t border-gray-100 dark:border-white/8">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Información académica
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel icon={GraduationCap}>Facultad</FieldLabel>
                <select
                  value={form.facultadId}
                  onChange={e => {
                    const nextFacultadId = e.target.value;
                    setForm(prev => ({ ...prev, facultadId: nextFacultadId, carreraId: "" }));
                  }}
                  disabled={!editing}
                  className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-gray-900 dark:text-white dark:bg-input/30 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:bg-input/50 dark:disabled:bg-input/80 appearance-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="" className="dark:bg-[#111]">—</option>
                  {facultades.map(f => (
                    <option key={f.id} value={f.id} className="dark:bg-[#111]">{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel icon={BookOpen}>Carrera</FieldLabel>
                <select
                  value={form.carreraId}
                  onChange={e => setForm(prev => ({ ...prev, carreraId: e.target.value }))}
                  disabled={!editing || !form.facultadId || carrerasLoading}
                  className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-gray-900 dark:text-white dark:bg-input/30 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:bg-input/50 dark:disabled:bg-input/80 appearance-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="" className="dark:bg-[#111]">
                    {!form.facultadId ? "Selecciona una facultad primero" : carrerasLoading ? "Cargando…" : "—"}
                  </option>
                  {carreras.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-[#111]">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer: Save / Cancel — solo cuando editing */}
        {editing && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 dark:border-white/12 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white transition cursor-pointer disabled:opacity-60 hover:brightness-110"
              style={{ backgroundColor: UC_PURPLE }}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t.profile.saving : t.profile.saveChanges}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
