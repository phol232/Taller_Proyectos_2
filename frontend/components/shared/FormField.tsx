"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  /** Texto del label */
  label: string;
  /** htmlFor del label → id del input */
  htmlFor?: string;
  /** Mensaje de error; si está presente muestra borde rojo y texto */
  error?: string;
  /** Elemento opcional a la derecha del label (ej: "¿Olvidaste tu contraseña?") */
  labelRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wrapper reutilizable: Label + Input slot + mensaje de error debajo.
 * Pasa `aria-invalid={!!error}` al <Input> para el borde rojo automático.
 */
export function FormField({
  label,
  htmlFor,
  error,
  labelRight,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-gray-600">
          {label}
        </Label>
        {labelRight}
      </div>

      {children}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
