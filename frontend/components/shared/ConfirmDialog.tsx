"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: "default" | "destructive" | "warning";
  isLoading?: boolean;
  confirmLabel?: string;
  /** z-index del popup. El overlay usa zIndex - 5. Default 50. */
  zIndex?: number;
}

const variantMap = {
  default: "default" as const,
  destructive: "destructive" as const,
  warning: "default" as const,
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = "default",
  isLoading = false,
  confirmLabel,
  zIndex,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-[380px] rounded-2xl border border-border bg-popover p-7 shadow-2xl"
        onOverlayClick={() => !isLoading && onOpenChange(false)}
        style={zIndex ? { zIndex } : undefined}
        overlayStyle={zIndex ? { zIndex: zIndex - 5 } : undefined}
      >
        <AlertDialogHeader className="mb-1 gap-2">
          <AlertDialogTitle className="text-lg font-bold leading-snug text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 flex flex-row justify-end gap-2 border-0 bg-transparent p-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant={variantMap[variant]}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isLoading
              ? t.common.processing
              : (confirmLabel ?? t.common.confirm)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}