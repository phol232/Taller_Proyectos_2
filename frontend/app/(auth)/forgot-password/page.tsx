"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Mail, KeyRound, Lock, Eye, EyeOff,
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

  /* ── Paso 1: Solicitar OTP ───────────────────────────── */
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
      // Para cualquier otro error, mostramos mensaje genérico
      // (el backend tampoco revela si el correo existe)
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

  /* ── Paso 2: Verificar OTP ───────────────────────────── */
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

  /* ── Paso 3: Cambiar contraseña ──────────────────────── */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = { newPass: "", confirm: "" };
    if (newPass.length < 8) newErrors.newPass = t.forgotPassword.minChars;
    if (!confirm) newErrors.confirm = t.forgotPassword.repeatPassword;
    else if (newPass !== confirm) newErrors.confirm = t.forgotPassword.passwordsMismatch;
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
      if (status === 400) {
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

  /* ── Progreso visual ─────────────────────────────────── */
  const steps: Step[] = ["email", "code", "password", "success"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="flex min-h-screen">

      {/* ── Columna izquierda — igual al login ──────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12"
        style={{ backgroundColor: UC.purple }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold text-white tracking-tight">Planner UC</span>
            <p className="text-[10px] text-white/50 leading-none">{t.login.academicSystem}</p>
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-pink-300">
            Universidad Continental
          </p>
          <h2 className="text-3xl font-bold text-white leading-snug">
            {t.forgotPassword.title}
            <br />
            <span className="text-pink-200">{t.forgotPassword.titleHighlight}</span>
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">
            {t.forgotPassword.subtitle}
          </p>

          {/* Pasos visuales */}
          <div className="space-y-3 pt-2">
            {[
              { icon: Mail,         label: t.forgotPassword.step1 },
              { icon: KeyRound,     label: t.forgotPassword.step2 },
              { icon: Lock,         label: t.forgotPassword.step3 },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: stepIdx > i ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
                    color: stepIdx > i ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {stepIdx > i ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className="text-sm"
                  style={{ color: stepIdx > i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/25">
          © {new Date().getFullYear()} {t.forgotPassword.copyright}
        </p>
      </div>

      {/* ── Columna derecha — Formulario ────────────────── */}
      <div className="flex flex-1 flex-col justify-between bg-white px-10 py-10">

        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step === "email" ? router.push("/login") : setStep(steps[stepIdx - 1] as Step))}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            disabled={step === "success"}
          >
            <ArrowLeft className="h-4 w-4" />
            {step === "email" ? t.forgotPassword.backToLogin : t.forgotPassword.previousStep}
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

        {/* Contenido del paso */}
        <div className="mx-auto w-full max-w-md">

          {/* PASO 1 — email */}
          {step === "email" && (
            <div className="space-y-8">
              <div className="space-y-1">
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: UC.purpleLight }}
                >
                  <Mail className="h-6 w-6" style={{ color: UC.purple }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{t.forgotPassword.forgotPasswordTitle}</h1>
                <p className="text-sm text-gray-500">
                  {t.forgotPassword.forgotPasswordDesc}
                </p>
              </div>

              <form onSubmit={handleSendCode} noValidate className="space-y-5">
                <FormField
                  label="Correo electrónico institucional"
                  htmlFor="email"
                  error={emailError}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.forgotPassword.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); emailError && setEmailError(""); }}
                    aria-invalid={!!emailError}
                  />
                </FormField>
                <Button
                  type="submit"
                  className="w-full text-white font-medium"
                  disabled={loading}
                  style={{ backgroundColor: UC.purple }}
                >
                  {loading ? t.forgotPassword.sendingCode : t.forgotPassword.sendCode}
                </Button>
              </form>
            </div>
          )}

          {/* PASO 2 — código OTP */}
          {step === "code" && (
            <div className="space-y-8">
              <div className="space-y-1">
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: UC.purpleLight }}
                >
                  <KeyRound className="h-6 w-6" style={{ color: UC.purple }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{t.forgotPassword.verificationCode}</h1>
                <p className="text-sm text-gray-500">
                  {t.forgotPassword.verificationCodeDesc.replace("{email}", "")}
                  <span className="font-semibold text-gray-700">{email}</span>.
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="space-y-3">
                  <Label>{t.forgotPassword.codeLabel}</Label>
                  <div className="flex gap-3">
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
                        aria-label={t.forgotPassword.digitLabel.replace("{n}", String(i + 1))}
                        className="h-14 w-full rounded-lg border border-input bg-background text-center text-xl font-bold shadow-sm outline-none transition focus:border-transparent focus:ring-2"
                        style={{ "--tw-ring-color": UC.purple } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-medium"
                  disabled={loading || code.join("").length < 6}
                  style={{ backgroundColor: UC.purple }}
                >
                  {loading ? t.forgotPassword.verifying : t.forgotPassword.verifyCode}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  {t.forgotPassword.noCode}{" "}
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    style={{ color: UC.purple }}
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    {t.forgotPassword.resend}
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* PASO 3 — nueva contraseña */}
          {step === "password" && (
            <div className="space-y-8">
              <div className="space-y-1">
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: UC.purpleLight }}
                >
                  <Lock className="h-6 w-6" style={{ color: UC.purple }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{t.forgotPassword.newPassword}</h1>
                <p className="text-sm text-gray-500">
                  {t.forgotPassword.newPasswordDesc}
                </p>
              </div>

              <form onSubmit={handleChangePassword} noValidate className="space-y-5">
                <FormField
                  label={t.forgotPassword.newPasswordLabel}
                  htmlFor="new-pass"
                  error={newPassError}
                >
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showNew ? "text" : "password"}
                      placeholder={t.forgotPassword.newPasswordPlaceholder}
                      value={newPass}
                      onChange={(e) => { setNewPass(e.target.value); newPassError && setNewPassError(""); }}
                      aria-invalid={!!newPassError}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? "Ocultar" : "Mostrar"}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField
                  label={t.forgotPassword.confirmPasswordLabel}
                  htmlFor="confirm-pass"
                  error={confirmError}
                >
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirm ? "text" : "password"}
                      placeholder={t.forgotPassword.confirmPasswordPlaceholder}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); confirmError && setConfirmError(""); }}
                      aria-invalid={!!confirmError}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <Button
                  type="submit"
                  className="w-full text-white font-medium"
                  disabled={loading || newPass !== confirm || newPass.length < 8}
                  style={{ backgroundColor: UC.purple }}
                >
                  {loading ? t.forgotPassword.saving : t.forgotPassword.setNewPassword}
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
                <h1 className="text-2xl font-bold text-gray-900">{t.forgotPassword.passwordUpdated}</h1>
                <p className="text-sm text-gray-500 max-w-sm">
                  {t.forgotPassword.passwordUpdatedDesc}
                </p>
              </div>
              <Button
                className="w-full max-w-sm text-white font-medium"
                style={{ backgroundColor: UC.purple }}
                onClick={() => router.push("/login")}
              >
                {t.forgotPassword.goToLogin}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>{t.forgotPassword.recoveryProblems}</span>
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
  );
}
