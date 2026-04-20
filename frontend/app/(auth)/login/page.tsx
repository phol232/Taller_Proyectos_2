"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, GraduationCap, CalendarDays,
  MapPin, BookOpen, ShieldCheck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/shared/FormField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import { toastError, toastSuccess } from "@/lib/utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Paleta Universidad Continental */
const UC = {
  purple:       "#6B21A8",
  purpleBg:     "rgba(107,33,168,0.08)",
  purpleLight:  "#F3E8FF",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const router       = useRouter();
  const searchParams = useSearchParams();
  const login        = useAuthStore((s) => s.login);
  const { t, locale } = useTranslation();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "domain_not_allowed") {
      setDomainModalOpen(true);
    } else if (error === "oauth2_failed") {
      toastError(t.login.googleLoginError, t.login.unexpectedError);
    }
  }, [searchParams]);

  /* ── Login form ───────────────────────────────────── */
  function handleGoogleLogin() {
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form     = new FormData(e.currentTarget);
    const email    = (form.get("email") as string).trim();
    const password = form.get("password") as string;

    const newErrors = { email: "", password: "" };
    if (!email) newErrors.email = t.login.emailRequired;
    else if (!email.endsWith("@continental.edu.pe")) newErrors.email = t.login.emailDomainError;
    if (!password) newErrors.password = t.login.passwordRequired;

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      const u = data.user;
      login({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl ?? undefined,
      });
      router.replace("/dashboard");
    } catch (err: unknown) {
      type ApiErr = {
        response?: {
          status: number;
          data?: { code?: string; fields?: Record<string, string> };
        };
      };
      const res   = (err as ApiErr)?.response;
      const status = res?.status;
      const code   = res?.data?.code;
      const fields = res?.data?.fields;

      if (status === 401) {
        if (code === "ACCOUNT_DISABLED") {
          toastError(t.login.accountDeactivated, t.login.accountDeactivatedDesc);
        } else {
          toastError(t.login.invalidCredentials, t.login.invalidCredentialsDesc);
        }
      } else if (status === 400 && fields?.email) {
        setErrors(p => ({ ...p, email: fields.email }));
      } else {
        toastError(t.login.loginError, t.login.unexpectedError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Modal: dominio no permitido ─────────────────── */}
      <Dialog open={domainModalOpen} onOpenChange={setDomainModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.login.emailNotAllowed}</DialogTitle>
            <DialogDescription className="pt-1">
              {t.login.emailNotAllowedDesc.split("@continental.edu.pe")[0]}
              <span className="font-semibold text-foreground">@continental.edu.pe</span>
              {t.login.emailNotAllowedDesc.split("@continental.edu.pe")[1]}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setDomainModalOpen(false)}
              style={{ backgroundColor: UC.purple, color: "#fff" }}
            >
              {t.login.understood}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Layout principal ────────────────────────────── */}
      <div className="flex min-h-screen">

        {/* Columna izquierda — Branding */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
          style={{ backgroundColor: UC.purple }}
        >
          {/* Logo + acreditación */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold text-white tracking-tight">{t.login.plannerUC}</span>
                <p className="text-[10px] text-white/50 leading-none">{t.login.academicSystem}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80">
              <ShieldCheck className="h-3 w-3" />
              {t.login.accredited}
            </span>
          </div>

          {/* Copy central */}
          <div className="relative z-10 space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-300">
                {t.login.universityName}
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white">
                {t.login.tagline.split(",")[0]},
                <br />
                <span className="text-pink-200">{t.login.tagline.split(",")[1]?.trim()}</span>
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              {t.login.taglineDesc}
            </p>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "30 000+", label: t.login.statsStudents },
                { value: "9",       label: t.login.statsFaculties },
                { value: "40+",     label: t.login.statsCareers },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-lg bg-white/10 px-3 py-3 text-center"
                >
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[11px] text-white/60">{label}</p>
                </div>
              ))}
            </div>

            {/* Features */}
            <ul className="space-y-2.5">
              {[
                { icon: CalendarDays,  text: t.login.features[0] },
                { icon: BookOpen,      text: t.login.features[1] },
                { icon: Clock,         text: t.login.features[2] },
                { icon: GraduationCap, text: t.login.features[3] },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15">
                    <Icon className="h-3.5 w-3.5 text-pink-200" />
                  </div>
                  <span className="text-sm text-white/75">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer izquierdo */}
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-1.5 text-white/40">
              <MapPin className="h-3 w-3" />
              <span className="text-xs">{t.login.location}</span>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} {t.login.copyright}
            </p>
          </div>
        </div>

        {/* Columna derecha — Formulario */}
        <div className="flex w-full lg:w-1/2 flex-col justify-between bg-white dark:bg-[#0a0a0a] px-10 py-10">

          {/* Header top derecho */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: UC.purple }}
              >
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.login.plannerUC}</span>
            </div>
            <span
              className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: UC.purpleLight, color: UC.purple }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.login.exclusiveAccess}
            </span>
          </div>

          {/* Form centrado */}
          <div className="mx-auto w-full max-w-sm space-y-7">

            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t.login.welcomeBack}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.login.enterCredentials}
              </p>
            </div>

            {/* Google OAuth */}
            <Button
              variant="outline"
              className="w-full gap-2 font-medium"
              type="button"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t.login.continueWithGoogle}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 dark:text-gray-500">{t.login.orWithEmail}</span>
              <Separator className="flex-1" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                label={t.login.emailLabel}
                htmlFor="email"
                error={errors.email}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t.login.emailPlaceholder}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  onChange={() => errors.email && setErrors(p => ({ ...p, email: "" }))}
                />
              </FormField>

              <FormField
                label={t.login.passwordLabel}
                htmlFor="password"
                error={errors.password}
                labelRight={
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-xs font-medium hover:underline"
                    style={{ color: UC.purple }}
                  >
                    {t.login.forgotPassword}
                  </button>
                }
              >
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.login.passwordPlaceholder}
                    autoComplete="current-password"
                    className="pr-10"
                    aria-invalid={!!errors.password}
                    onChange={() => errors.password && setErrors(p => ({ ...p, password: "" }))}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <Button
                type="submit"
                className="w-full font-medium text-white"
                disabled={loading}
                style={{ backgroundColor: UC.purple, color: "#fff" }}
              >
                {loading ? t.login.loggingIn : t.login.logIn}
              </Button>
            </form>

            {/* Aviso institucional */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              {t.login.termsNotice}{" "}
              <a href="#" className="underline hover:text-gray-600 dark:hover:text-gray-300">{t.login.termsOfUse}</a>{" "}
              {locale === "es" ? "y la" : "and the"}{" "}
              <a href="#" className="underline hover:text-gray-600 dark:hover:text-gray-300">{t.login.privacyPolicy}</a>{" "}
              {t.login.ofUniversity}
            </p>
          </div>

          {/* Footer derecho */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{t.login.loginProblems}</span>
            <a
              href="mailto:soporte@continental.edu.pe"
              className="font-medium hover:underline"
              style={{ color: UC.purple }}
            >
              soporte@continental.edu.pe
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
