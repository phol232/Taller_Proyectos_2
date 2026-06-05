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
  const errorId = React.useId();
  const errorMessageId = error ? errorId : undefined;

  const clonedChildren = React.useMemo(() => {
    if (!error) return children;
    if (!React.isValidElement(children)) return children;

    const el = children as React.ReactElement<Record<string, unknown>>;
    const isNativeWrapper =
      typeof el.type === "string" &&
      !["input", "select", "textarea"].includes(el.type);
    if (isNativeWrapper) return children;

    return React.cloneElement(el, {
      "aria-invalid": true,
      "aria-describedby": errorMessageId,
    });
  }, [children, error, errorMessageId]);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor={htmlFor} className="text-[14px] font-medium text-foreground">
            {label}
          </Label>
          {description && (
            <p className="text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {labelRight && <div className="shrink-0">{labelRight}</div>}
      </div>

      <div className="space-y-2">
        {clonedChildren}
        {error && (
          <p id={errorMessageId} className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
