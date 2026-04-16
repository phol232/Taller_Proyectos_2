import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Toast de error — dura 2 s */
export const toastError = (title: string, description?: string) =>
  toast.error(title, { description, duration: 2100 })

/** Toast de éxito — dura 1.5 s */
export const toastSuccess = (title: string, description?: string) =>
  toast.success(title, { description, duration: 1300 })
