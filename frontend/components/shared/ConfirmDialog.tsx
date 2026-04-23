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
  variant?: "default" | "destructive";
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
  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-sm rounded-xl border-0 bg-white p-6 shadow-xl dark:bg-[#1a1a1a]"
        onOverlayClick={() => !isLoading && onOpenChange(false)}
        style={zIndex ? { zIndex } : undefined}
        overlayStyle={zIndex ? { zIndex: zIndex - 5 } : undefined}
      >
        <AlertDialogHeader className="mb-2">
          <AlertDialogTitle className="text-[17px] font-semibold text-gray-900 dark:text-white">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 grid grid-cols-2 gap-2 border-0 bg-transparent p-0">
          <AlertDialogCancel
            disabled={isLoading}
            className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.06]"
          >
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "h-10 rounded-lg px-5 text-sm font-semibold text-white",
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#6B21A8] hover:bg-[#581c87] dark:bg-[#7e22ce] dark:hover:bg-[#9333ea]"
            )}
          >
            {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {isLoading ? t.common.processing : (confirmLabel ?? t.common.confirm)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
