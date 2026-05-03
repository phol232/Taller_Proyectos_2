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
import { toastError } from "@/lib/utils";

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
  const { t } = useTranslation();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "domain_not_allowed") {
      setDomainModalOpen(true);
    } else if (error === "oauth2_failed") {
      toastError(t.login.googleLoginError, t.login.unexpectedError);
    }
  }, [searchParams, t]);

  function handleGoogleLogin() {
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google?redirect_uri=${redirectUri}`;
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
      {/* Modal: dominio no permitido */}
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

      {/* Layout principal sin scroll */}
      <div className="relative flex min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
        
        {/* Fondo con patrón de cuadrícula */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            backgroundColor: UC.purple,
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />

        {/* Contenedor principal centrado */}
        <div className="relative z-10 flex w-full items-center justify-center p-6">
          
          {/* Card principal */}
          <div className="w-full max-w-6xl h-auto lg:h-[90vh] lg:max-h-[800px]">
            <div className="grid lg:grid-cols-2 gap-0 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl overflow-hidden lg:h-full">
              
              {/* Panel izquierdo - Información del sistema */}
              <div 
                className="hidden lg:flex relative p-10 flex-col justify-between"
                style={{ 
                  background: `linear-gradient(135deg, ${UC.purple} 0%, #7C3AED 100%)`
                }}
              >
                {/* Patrón de puntos decorativo */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
                    backgroundSize: '32px 32px'
                  }} />
                </div>

                {/* Contenido superior */}
                <div className="relative z-10 space-y-8">
                  {/* Logo y badge */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
                        <CalendarDays className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <span className="text-xl font-bold text-white tracking-tight">Planner UC</span>
                        <p className="text-xs text-white/60 leading-none mt-0.5">Sistema Académico</p>
                      </div>
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Acreditado Internacionalmente
                    </span>
                  </div>

                  {/* Título principal */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200 mb-2">
                        Universidad Continental
                      </p>
                      <h1 className="text-3xl font-bold leading-tight text-white">
                        Gestión Académica
                        <br />
                        <span className="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                          Inteligente y Eficiente
                        </span>
                      </h1>
                    </div>
                    <p className="text-sm leading-relaxed text-white/80 max-w-md">
                      Plataforma integral para la planificación y gestión de horarios académicos
                    </p>
                  </div>

                  {/* Features compactas */}
                  <div className="space-y-2.5">
                    {[
                      { icon: CalendarDays, text: "Planificación automática de horarios" },
                      { icon: BookOpen, text: "Gestión de cursos y docentes" },
                      { icon: Clock, text: "Optimización de recursos académicos" },
                      { icon: GraduationCap, text: "Acceso para toda la comunidad UC" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
                          <Icon className="h-4 w-4 text-purple-200" />
                        </div>
                        <span className="text-sm text-white/90">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 space-y-1.5 pt-6 border-t border-white/20">
                  <div className="flex items-center gap-2 text-white/50">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-xs">Huancayo, Perú</span>
                  </div>
                  <p className="text-xs text-white/40">
                    © {new Date().getFullYear()} Planner UC — Universidad Continental
                  </p>
                </div>
              </div>

              {/* Panel derecho - Formulario */}
              <div className="relative flex flex-col justify-center p-6 sm:p-10 bg-white dark:bg-gray-950 overflow-y-auto lg:overflow-y-visible">
                
                {/* Badge superior derecho - oculto en móvil, visible en desktop */}
                <div className="hidden lg:block absolute top-6 right-6">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                    style={{ backgroundColor: UC.purpleLight, color: UC.purple }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Acceso exclusivo comunidad UC
                  </span>
                </div>

                {/* Badge móvil - visible solo en móvil, arriba del formulario */}
                <div className="lg:hidden mb-6 flex justify-center">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                    style={{ backgroundColor: UC.purpleLight, color: UC.purple }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Acceso exclusivo comunidad UC
                  </span>
                </div>

                {/* Formulario centrado */}
                <div className="w-full max-w-sm mx-auto space-y-6">
                  
                  {/* Header */}
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      Iniciar Sesión
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Accede con tus credenciales institucionales
                    </p>
                  </div>

                  {/* Google OAuth */}
                  <Button
                    variant="outline"
                    className="w-full h-11 gap-2.5 font-medium border-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                    type="button"
                    onClick={handleGoogleLogin}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar con Google
                  </Button>

                  {/* Separador */}
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      O con correo
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {/* Formulario */}
                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <FormField
                      label="Correo institucional"
                      htmlFor="email"
                      error={errors.email}
                    >
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="usuario@continental.edu.pe"
                        autoComplete="email"
                        className="h-11"
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
                          className="text-xs font-semibold hover:underline transition-all"
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
                          className="h-11 pr-11"
                          aria-invalid={!!errors.password}
                          onChange={() => errors.password && setErrors(p => ({ ...p, password: "" }))}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </FormField>

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      disabled={loading}
                      style={{ 
                        backgroundColor: UC.purple,
                        color: "#fff"
                      }}
                    >
                      {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </Button>
                  </form>

                  {/* Aviso legal compacto */}
                  <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Al ingresar aceptas los{" "}
                    <a href="#" className="font-medium underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      Términos de Uso
                    </a>{" "}
                    y la{" "}
                    <a href="#" className="font-medium underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      Política de Privacidad
                    </a>
                  </p>

                  {/* Soporte */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>¿Problemas para ingresar?</span>
                      <a
                        href="mailto:soporte@continental.edu.pe"
                        className="font-semibold hover:underline transition-all"
                        style={{ color: UC.purple }}
                      >
                        Contactar soporte
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
