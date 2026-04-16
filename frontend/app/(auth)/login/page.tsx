"use client";

import { useState, useEffect } from "react";
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
import { toastError, toastSuccess } from "@/lib/utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Paleta Universidad Continental */
const UC = {
  purple:       "#6B21A8",
  purpleBg:     "rgba(107,33,168,0.08)",
  purpleLight:  "#F3E8FF",
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const router       = useRouter();
  const searchParams = useSearchParams();
  const login        = useAuthStore((s) => s.login);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "domain_not_allowed") {
      setDomainModalOpen(true);
    } else if (error === "oauth2_failed") {
      toastError("Error al iniciar sesión con Google", "Ocurrió un error inesperado. Inténtalo de nuevo.");
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
    if (!email) newErrors.email = "El correo es obligatorio.";
    else if (!email.endsWith("@continental.edu.pe")) newErrors.email = "Solo se permiten correos @continental.edu.pe.";
    if (!password) newErrors.password = "La contraseña es obligatoria.";

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      login(data.user);
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
          toastError("Cuenta desactivada", "Contacta al administrador para recuperar el acceso.");
        } else {
          toastError("Credenciales incorrectas", "Revisa tu email y contraseña.");
        }
      } else if (status === 400 && fields?.email) {
        setErrors(p => ({ ...p, email: fields.email }));
      } else {
        toastError("Error al iniciar sesión", "Ocurrió un error inesperado. Inténtalo de nuevo.");
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
            <DialogTitle>Correo no permitido</DialogTitle>
            <DialogDescription className="pt-1">
              Solo se permiten cuentas institucionales con dominio{" "}
              <span className="font-semibold text-foreground">@continental.edu.pe</span>.
              Usa tu cuenta de Google institucional para acceder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setDomainModalOpen(false)}
              style={{ backgroundColor: UC.purple, color: "#fff" }}
            >
              Entendido
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
                <span className="text-lg font-semibold text-white tracking-tight">Planner UC</span>
                <p className="text-[10px] text-white/50 leading-none">Sistema de Gestión Académica</p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80">
              <ShieldCheck className="h-3 w-3" />
              Acreditada
            </span>
          </div>

          {/* Copy central */}
          <div className="relative z-10 space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pink-300">
                Universidad Continental
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white">
                Tu horario,
                <br />
                <span className="text-pink-200">siempre a la mano.</span>
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Consulta tus horarios, clases y actividades académicas desde un
              solo lugar, sin importar tu rol en la universidad.
            </p>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "30 000+", label: "Estudiantes" },
                { value: "9",       label: "Facultades" },
                { value: "40+",     label: "Carreras" },
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
                { icon: CalendarDays,  text: "Consulta tu horario semanal en segundos" },
                { icon: BookOpen,      text: "Accede a tus cursos y docentes asignados" },
                { icon: Clock,         text: "Recibe alertas de cambios en tu horario" },
                { icon: GraduationCap, text: "Disponible para estudiantes, docentes y más" },
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
              <span className="text-xs">Huancayo, Perú</span>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Planner UC — Universidad Continental
            </p>
          </div>
        </div>

        {/* Columna derecha — Formulario */}
        <div className="flex w-full lg:w-1/2 flex-col justify-between bg-white px-10 py-10">

          {/* Header top derecho */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: UC.purple }}
              >
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Planner UC</span>
            </div>
            <span
              className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: UC.purpleLight, color: UC.purple }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Acceso exclusivo comunidad UC
            </span>
          </div>

          {/* Form centrado */}
          <div className="mx-auto w-full max-w-sm space-y-7">

            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Bienvenido de vuelta</h2>
              <p className="text-sm text-gray-500">
                Ingresa tus credenciales institucionales para acceder al sistema
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
              Continuar con Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400">o con email</span>
              <Separator className="flex-1" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                label="Correo electrónico"
                htmlFor="email"
                error={errors.email}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@continental.edu.pe"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  onChange={() => errors.email && setErrors(p => ({ ...p, email: "" }))}
                />
              </FormField>

              <FormField
                label="Contraseña"
                htmlFor="password"
                error={errors.password}
                labelRight={
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-xs font-medium hover:underline"
                    style={{ color: UC.purple }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                }
              >
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    aria-invalid={!!errors.password}
                    onChange={() => errors.password && setErrors(p => ({ ...p, password: "" }))}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                {loading ? "Iniciando sesión…" : "Iniciar sesión"}
              </Button>
            </form>

            {/* Aviso institucional */}
            <p className="text-center text-xs text-gray-400">
              Al ingresar aceptas los{" "}
              <a href="#" className="underline hover:text-gray-600">Términos de uso</a>{" "}
              y la{" "}
              <a href="#" className="underline hover:text-gray-600">Política de privacidad</a>{" "}
              de la Universidad Continental.
            </p>
          </div>

          {/* Footer derecho */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>¿Problemas para ingresar?</span>
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
