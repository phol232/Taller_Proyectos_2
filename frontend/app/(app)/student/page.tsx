"use client";

import { useAuthStore } from "@/store/auth.store";
import PageShell from "@/components/layout/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface QuickAction {
  title:       string;
  description: string;
  href:        string;
  icon:        React.ReactNode;
  iconBg:      string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title:       "Mi Horario",
    description: "Consulta tu horario asignado para el ciclo actual.",
    href:        "/student/my-schedule",
    icon:        <CalendarDays className="h-5 w-5 text-blue-600" />,
    iconBg:      "bg-blue-50",
  },
  {
    title:       "Ver Horarios",
    description: "Explora los horarios disponibles de todas las secciones.",
    href:        "/student/schedule/generate",
    icon:        <BookOpen className="h-5 w-5 text-purple-600" />,
    iconBg:      "bg-purple-50",
  },
  {
    title:       "Armar Horario",
    description: "Crea tu combinación ideal de cursos sin conflictos.",
    href:        "/student/schedule/builder",
    icon:        <Sparkles className="h-5 w-5 text-amber-600" />,
    iconBg:      "bg-amber-50",
  },
];

const INFO_CARDS = [
  {
    label: "Ciclo actual",
    value: "2025-I",
    sub:   "Semestre en curso",
    icon:  <Clock className="h-4 w-4 text-gray-400" />,
  },
  {
    label: "Cursos matriculados",
    value: "—",
    sub:   "Disponible en Fase 3",
    icon:  <CheckCircle2 className="h-4 w-4 text-gray-400" />,
  },
  {
    label: "Créditos",
    value: "—",
    sub:   "Disponible en Fase 3",
    icon:  <BookOpen className="h-4 w-4 text-gray-400" />,
  },
];

export default function StudentHomePage() {
  const { user } = useAuthStore();

  const firstName = user?.name?.split(" ")[0] ?? "Estudiante";

  return (
    <PageShell
      title={`Hola, ${firstName} 👋`}
      description="Bienvenido a tu panel de horarios. Aquí puedes gestionar y consultar tu agenda académica."
    >
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {INFO_CARDS.map((card) => (
          <Card key={card.label} className="p-4 bg-white border border-gray-100 shadow-none rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {card.label}
              </span>
              {card.icon}
            </div>
            <p className="text-2xl font-semibold text-vercel-black tracking-tight">
              {card.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </Card>
        ))}
      </div>

      {/* Acciones rápidas */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-3">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <Card
            key={action.href}
            className="group p-5 bg-white border border-gray-100 shadow-none rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <Link href={action.href} className="flex flex-col gap-3 h-full">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.iconBg}`}>
                {action.icon}
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-vercel-black mb-0.5">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-vercel-black transition-colors mt-1">
                Ir ahora
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
