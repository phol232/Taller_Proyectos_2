"use client";

import { BookOpen, Layers, Sparkles, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AddCourseMode } from "@/components/schedule/builder/AddCourseDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (mode: AddCourseMode, componentHint?: "THEORY" | "PRACTICE") => void;
  contextLabel?: string | null;
}

const OPTIONS: {
  key: AddCourseMode | "THEORY_ONLY" | "PRACTICE_ONLY";
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    key: "THEORY_ONLY",
    label: "Sesión de teoría",
    desc: "Programar únicamente la sesión teórica del curso.",
    icon: <BookOpen className="h-4 w-4" />,
    accent: "border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/40",
  },
  {
    key: "PRACTICE_ONLY",
    label: "Sesión de práctica",
    desc: "Programar únicamente la sesión práctica o de laboratorio.",
    icon: <Wrench className="h-4 w-4" />,
    accent: "border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/40",
  },
  {
    key: "FULL_BOTH",
    label: "Curso completo",
    desc: "Programar teoría y práctica del curso en un solo paso.",
    icon: <Layers className="h-4 w-4" />,
    accent: "border-[#e9d5ff] dark:border-[#6B21A8]/40 bg-[#faf5ff] dark:bg-[#6B21A8]/15",
  },
  {
    key: "GENERAL",
    label: "Curso sin desglose",
    desc: "Cursos que se dictan en una única sesión semanal.",
    icon: <Sparkles className="h-4 w-4" />,
    accent: "border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/40",
  },
];

export default function ModeSelectorDialog({ open, onOpenChange, onPick, contextLabel }: Props) {
  function pick(key: typeof OPTIONS[number]["key"]) {
    if (key === "THEORY_ONLY") onPick("FULL", "THEORY");
    else if (key === "PRACTICE_ONLY") onPick("FULL", "PRACTICE");
    else onPick(key);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tipo de programación</DialogTitle>
          <DialogDescription>
            {contextLabel
              ? `Destino: ${contextLabel}. Seleccione la modalidad a programar.`
              : "Seleccione la modalidad de programación a registrar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => pick(opt.key)}
              className={`rounded-lg border ${opt.accent} px-4 py-3 text-left transition hover:brightness-95 dark:hover:brightness-110`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {opt.icon}
                {opt.label}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
