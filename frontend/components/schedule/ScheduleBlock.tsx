// TODO Fase 2: Bloque individual de la grilla semanal — RF-16
import type { Assignment } from "@/types/schedule";

interface ScheduleBlockProps {
  assignment: Assignment;
  hasConflict?: boolean;
}

export default function ScheduleBlock({ assignment, hasConflict = false }: ScheduleBlockProps) {
  return (
    <div
      className={`p-2 rounded text-xs ${
        hasConflict
          ? "border-2 border-ship-red bg-ship-red/5"
          : "card-border bg-pure-white"
      }`}
    >
      <p className="font-medium text-vercel-black">{assignment.courseCode}</p>
      <p className="text-gray-500">{assignment.teacherName}</p>
      <p className="text-gray-400">{assignment.classroomCode}</p>
    </div>
  );
}
