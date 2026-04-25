"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
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

  const actionClass = {
    destructive: "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white",
    default: "bg-[#6B21A8] hover:bg-[#581c87] active:bg-[#4a1572] text-white dark:bg-[#7e22ce] dark:hover:bg-[#9333ea]",
  }[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-[380px] rounded-2xl border-0 bg-white p-7 shadow-2xl dark:bg-[#1c1c1e]"
        onOverlayClick={() => !isLoading && onOpenChange(false)}
        style={zIndex ? { zIndex } : undefined}
        overlayStyle={zIndex ? { zIndex: zIndex - 5 } : undefined}
      >
        <AlertDialogHeader className="mb-1 gap-2">
          <AlertDialogTitle className="text-[18px] font-bold leading-snug text-gray-900 dark:text-white">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 flex flex-row justify-end gap-2.5 border-0 bg-transparent p-0">
          <AlertDialogCancel
            disabled={isLoading}
            className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-[14px] font-semibold text-gray-800 shadow-none transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.06]"
          >
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "h-11 min-w-[100px] rounded-xl px-5 text-[14px] font-semibold shadow-none transition-colors disabled:opacity-60",
              actionClass
            )}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {isLoading
              ? t.common.processing
              : (confirmLabel ?? t.common.confirm)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
