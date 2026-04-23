"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  labelRight?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  labelRight,
  description,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor={htmlFor} className="text-[14px] font-medium text-[#171717]">
            {label}
          </Label>
          {description && (
            <p className="text-xs leading-5 text-[#666666]">
              {description}
            </p>
          )}
        </div>
        {labelRight && <div className="shrink-0">{labelRight}</div>}
      </div>

      <div className="space-y-2">
        {children}
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
