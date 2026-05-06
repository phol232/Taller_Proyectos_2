"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Mail, KeyRound, Lock, Eye, EyeOff,
  ShieldCheck, MapPin, BookOpen, Clock, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/shared/FormField";
import api from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const UC = {
  purple:      "#6B21A8",
  purpleLight: "#F3E8FF",
};

type Step = "email" | "code" | "password" | "success";

type ApiErrorResponse = {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
};

function validateNewPasswordFields(
  newPass: string,
  confirm: string,
  messages: {
    minChars: string;
    passwordComplexity: string;
    passwordMissingRequirements: string;
    passwordRequirementUppercase: string;
    passwordRequirementLowercase: string;
    passwordRequirementNumber: string;
    passwordRequirementSpecial: string;
    passwordInvalidChars: string;
    repeatPassword: string;
    passwordsMismatch: string;
  }
) {
  const errors = { newPass: "", confirm: "" };

  if (newPass.length < 8) {
    errors.newPass = messages.minChars;
  } else if (containsUnsupportedPasswordChars(newPass)) {
    errors.newPass = messages.passwordInvalidChars;
  } else if (!hasValidPasswordComplexity(newPass)) {
    const missingRules: string[] = [];

    if (![...newPass].some(isUppercaseChar)) missingRules.push(messages.passwordRequirementUppercase);
    if (![...newPass].some(isLowercaseChar)) missingRules.push(messages.passwordRequirementLowercase);
    if (![...newPass].some(isDigitChar)) missingRules.push(messages.passwordRequirementNumber);
    if (![...newPass].some(isSpecialChar)) missingRules.push(messages.passwordRequirementSpecial);

    errors.newPass = missingRules.length > 0
      ? messages.passwordMissingRequirements.replace("{items}", missingRules.join(", "))
      : messages.passwordComplexity;
  }

  if (!confirm) {
    errors.confirm = messages.repeatPassword;
  } else if (newPass !== confirm) {
    errors.confirm = messages.passwordsMismatch;
  }

  return errors;
}

function hasValidPasswordComplexity(value: string) {
  const characters = [...value];

  return characters.some(isUppercaseChar)
    && characters.some(isLowercaseChar)
    && characters.some(isDigitChar)
    && characters.some(isSpecialChar);
}

function containsUnsupportedPasswordChars(value: string) {
  return [...value].some((character) => /\s/u.test(character) || isControlChar(character));
}

function isUppercaseChar(character: string) {
  return /\p{Lu}/u.test(character);
}

function isLowercaseChar(character: string) {
  return /\p{Ll}/u.test(character);
}

function isDigitChar(character: string) {
  return /\p{Nd}/u.test(character);
}

function isSpecialChar(character: string) {
  return !isUppercaseChar(character)
    && !isLowercaseChar(character)
    && !isDigitChar(character)
    && !/\s/u.test(character)
    && !isControlChar(character);
}

function isControlChar(character: string) {
  return /\p{Cc}|\p{Cf}/u.test(character);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep]             = useState<Step>("email");
  const [email, setEmail]           = useState("");
  const [code, setCode]             = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass]       = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [emailError, setEmailError]       = useState("");
  const [newPassError, setNewPassError]   = useState("");
  const [confirmError, setConfirmError]   = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t.forgotPassword.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t.forgotPassword.emailInvalid);
      return;
    }
    if (!trimmed.toLowerCase().endsWith("@continental.edu.pe")) {
      setEmailError(t.forgotPassword.domainNotAllowed);
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/request", { email });
      setStep("code");
      setTimeout(() => codeRefs.current[0]?.focus(), 80);
      toastSuccess(t.forgotPassword.codeSent, t.forgotPassword.codeSentDesc);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 429) {
        toastError(t.forgotPassword.tooManyRequests, t.forgotPassword.tooManyRequestsDesc);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(i: number, val: string) {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.join("").length < 6) return;
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/password-reset/verify", {
        email,
        otp: code.join(""),
      });
      setResetToken(data.resetToken);
      setStep("password");
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 429) {
        toastError(t.forgotPassword.tooManyAttempts, t.forgotPassword.tooManyAttemptsDesc);
        setCode(["", "", "", "", "", ""]);
        setStep("email");
      } else {
        toastError(t.forgotPassword.invalidCode, message ?? t.forgotPassword.invalidCodeDesc);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => codeRefs.current[0]?.focus(), 80);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = validateNewPasswordFields(newPass, confirm, {
      minChars: t.forgotPassword.minChars,
      passwordComplexity: t.forgotPassword.passwordComplexity,
      passwordMissingRequirements: t.forgotPassword.passwordMissingRequirements,
      passwordRequirementUppercase: t.forgotPassword.passwordRequirementUppercase,
      passwordRequirementLowercase: t.forgotPassword.passwordRequirementLowercase,
      passwordRequirementNumber: t.forgotPassword.passwordRequirementNumber,
      passwordRequirementSpecial: t.forgotPassword.passwordRequirementSpecial,
      passwordInvalidChars: t.forgotPassword.passwordInvalidChars,
      repeatPassword: t.forgotPassword.repeatPassword,
      passwordsMismatch: t.forgotPassword.passwordsMismatch,
    });

    if (newErrors.newPass || newErrors.confirm) {
      setNewPassError(newErrors.newPass);
      setConfirmError(newErrors.confirm);
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/reset", {
        resetToken,
        newPassword: newPass,
      });
      setStep("success");
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const data = (err as { response?: { data?: ApiErrorResponse } })?.response?.data;

      if (status === 400 && data?.code === "VALIDATION_ERROR") {
        const passwordError = data.errors?.newPassword ?? data.message ?? t.forgotPassword.passwordComplexity;
        setNewPassError(passwordError);
        toastError(t.forgotPassword.updateError, passwordError);
      } else if (status === 400) {
        toastError(t.forgotPassword.linkExpired, t.forgotPassword.linkExpiredDesc);
        setStep("email");
        setCode(["", "", "", "", "", ""]);
        setResetToken("");
      } else {
        toastError(t.forgotPassword.updateError, t.forgotPassword.updateErrorDesc);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setCode(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/request", { email });
      toastSuccess(t.forgotPassword.newCodeSent, t.forgotPassword.newCodeSentDesc);
      setTimeout(() => codeRefs.current[0]?.focus(), 80);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 429) {
        toastError(t.forgotPassword.tooManyRequests, t.forgotPassword.tooManyRequestsDesc);
      }
    } finally {
      setLoading(false);
    }
  }

  const steps: Step[] = ["email", "code", "password", "success"];
  const stepIdx = steps.indexOf(step);

  return (
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
                      Recuperación de
                      <br />
                      <span className="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                        Contraseña
                      </span>
                    </h1>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80 max-w-md">
                    Sigue los pasos para restablecer tu contraseña de forma segura
                  </p>
                </div>

                {/* Pasos visuales */}
                <div className="space-y-2.5">
                  {[
                    { icon: Mail, text: "Ingresa tu correo institucional" },
                    { icon: KeyRound, text: "Verifica el código enviado" },
                    { icon: Lock, text: "Establece nueva contraseña" },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={text} className="flex items-center gap-3">
                      <div 
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm border"
                        style={{
                          backgroundColor: stepIdx > i ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                          borderColor: stepIdx > i ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {stepIdx > i ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <Icon className="h-4 w-4 text-purple-200" />
                        )}
                      </div>
                      <span 
                        className="text-sm"
                        style={{ color: stepIdx > i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)" }}
                      >
                        {text}
                      </span>
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
              
              {/* Barra superior con navegación */}
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => (step === "email" ? router.push("/login") : setStep(steps[stepIdx - 1] as Step))}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  disabled={step === "success"}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {step === "email" ? "Volver al login" : "Paso anterior"}
                </button>

                {/* Indicador de pasos */}
                <div className="flex items-center gap-1.5">
                  {steps.slice(0, 3).map((s, i) => (
                    <div
                      key={s}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: stepIdx >= i ? "24px" : "8px",
                        backgroundColor: stepIdx >= i ? UC.purple : "#E5E7EB",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Formulario centrado */}
              <div className="w-full max-w-sm mx-auto space-y-6 mt-16 lg:mt-0">

                {/* PASO 1 — email */}
                {step === "email" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: UC.purpleLight }}
                      >
                        <Mail className="h-6 w-6" style={{ color: UC.purple }} />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">¿Olvidaste tu contraseña?</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Ingresa tu correo institucional y te enviaremos un código de verificación
                      </p>
                    </div>

                    <form onSubmit={handleSendCode} noValidate className="space-y-4">
                      <FormField
                        label="Correo institucional"
                        htmlFor="email"
                        error={emailError}
                      >
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@continental.edu.pe"
                          value={email}
                          className="h-11"
                          onChange={(e) => { setEmail(e.target.value); emailError && setEmailError(""); }}
                          aria-invalid={!!emailError}
                        />
                      </FormField>
                      <Button
                        type="submit"
                        className="w-full h-11 text-white font-semibold"
                        disabled={loading}
                        style={{ backgroundColor: UC.purple }}
                      >
                        {loading ? "Enviando código..." : "Enviar código"}
                      </Button>
                    </form>
                  </div>
                )}

                {/* PASO 2 — código OTP */}
                {step === "code" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: UC.purpleLight }}
                      >
                        <KeyRound className="h-6 w-6" style={{ color: UC.purple }} />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Código de verificación</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Ingresa el código de 6 dígitos enviado a{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
                      </p>
                    </div>

                    <form onSubmit={handleVerifyCode} className="space-y-5">
                      <div className="space-y-3">
                        <Label>Código de verificación</Label>
                        <div className="flex gap-2">
                          {code.map((digit, i) => (
                            <input
                              key={i}
                              ref={(el) => { codeRefs.current[i] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(i, e.target.value)}
                              onKeyDown={(e) => handleDigitKeyDown(i, e)}
                              aria-label={`Dígito ${i + 1}`}
                              className="h-12 w-full rounded-lg border border-input bg-background text-center text-xl font-bold shadow-sm outline-none transition focus:border-transparent focus:ring-2"
                              style={{ "--tw-ring-color": UC.purple } as React.CSSProperties}
                            />
                          ))}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 text-white font-semibold"
                        disabled={loading || code.join("").length < 6}
                        style={{ backgroundColor: UC.purple }}
                      >
                        {loading ? "Verificando..." : "Verificar código"}
                      </Button>

                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        ¿No recibiste el código?{" "}
                        <button
                          type="button"
                          className="font-semibold hover:underline"
                          style={{ color: UC.purple }}
                          onClick={handleResendCode}
                          disabled={loading}
                        >
                          Reenviar
                        </button>
                      </p>
                    </form>
                  </div>
                )}

                {/* PASO 3 — nueva contraseña */}
                {step === "password" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: UC.purpleLight }}
                      >
                        <Lock className="h-6 w-6" style={{ color: UC.purple }} />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva contraseña</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Crea una contraseña segura para tu cuenta
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} noValidate className="space-y-4">
                      <FormField
                        label="Nueva contraseña"
                        htmlFor="new-pass"
                        error={newPassError}
                      >
                        <div className="relative">
                          <Input
                            id="new-pass"
                            type={showNew ? "text" : "password"}
                            placeholder="••••••••"
                            value={newPass}
                            className="h-11 pr-11"
                            onChange={(e) => { setNewPass(e.target.value); newPassError && setNewPassError(""); }}
                            aria-invalid={!!newPassError}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            aria-label={showNew ? "Ocultar" : "Mostrar"}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showNew ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </FormField>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos
                      </p>

                      <FormField
                        label="Confirmar contraseña"
                        htmlFor="confirm-pass"
                        error={confirmError}
                      >
                        <div className="relative">
                          <Input
                            id="confirm-pass"
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirm}
                            className="h-11 pr-11"
                            onChange={(e) => { setConfirm(e.target.value); confirmError && setConfirmError(""); }}
                            aria-invalid={!!confirmError}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </FormField>

                      <Button
                        type="submit"
                        className="w-full h-11 text-white font-semibold"
                        disabled={loading || !newPass || !confirm}
                        style={{ backgroundColor: UC.purple }}
                      >
                        {loading ? "Guardando..." : "Establecer contraseña"}
                      </Button>
                    </form>
                  </div>
                )}

                {/* PASO 4 — éxito */}
                {step === "success" && (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full"
                      style={{ backgroundColor: UC.purpleLight }}
                    >
                      <CheckCircle2 className="h-10 w-10" style={{ color: UC.purple }} />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">¡Contraseña actualizada!</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                        Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                      </p>
                    </div>
                    <Button
                      className="w-full h-11 text-white font-semibold"
                      style={{ backgroundColor: UC.purple }}
                      onClick={() => router.push("/login")}
                    >
                      Ir al login
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>¿Problemas para recuperar tu cuenta?</span>
                  <a
                    href="mailto:soporte@continental.edu.pe"
                    className="font-semibold hover:underline"
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
  );
}
