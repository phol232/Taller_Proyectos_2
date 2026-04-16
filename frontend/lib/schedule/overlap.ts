import type { Assignment, TimeSlot } from "@/types/schedule";

/**
 * Detecta si dos franjas horarias se solapan.
 * Devuelve `true` si existe superposición (conflicto).
 * RF-08, RF-10, RF-14
 */
export function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.day !== b.day) return false;

  const startA = toMinutes(a.startTime);
  const endA   = toMinutes(a.endTime);
  const startB = toMinutes(b.startTime);
  const endB   = toMinutes(b.endTime);

  // Se solapan si uno empieza antes de que el otro termine
  return startA < endB && startB < endA;
}

/**
 * Encuentra solapamientos de docentes en el conjunto de asignaciones.
 * Devuelve pares conflictivos.
 */
export function findTeacherOverlaps(
  assignments: Assignment[]
): [Assignment, Assignment][] {
  const conflicts: [Assignment, Assignment][] = [];

  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a = assignments[i];
      const b = assignments[j];
      if (
        a.teacherId === b.teacherId &&
        timeSlotsOverlap(a.timeSlot, b.timeSlot)
      ) {
        conflicts.push([a, b]);
      }
    }
  }

  return conflicts;
}

/**
 * Encuentra solapamientos de aulas en el conjunto de asignaciones.
 */
export function findClassroomOverlaps(
  assignments: Assignment[]
): [Assignment, Assignment][] {
  const conflicts: [Assignment, Assignment][] = [];

  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a = assignments[i];
      const b = assignments[j];
      if (
        a.classroomId === b.classroomId &&
        timeSlotsOverlap(a.timeSlot, b.timeSlot)
      ) {
        conflicts.push([a, b]);
      }
    }
  }

  return conflicts;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
