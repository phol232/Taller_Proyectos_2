import type { Assignment } from "@/types/schedule";

/**
 * Suma los créditos de las asignaciones de un estudiante.
 * RF-13, RF-14
 */
export function sumCredits(
  assignments: Assignment[],
  creditMap: Record<string, number>
): number {
  return assignments.reduce(
    (total, a) => total + (creditMap[a.courseId] ?? 0),
    0
  );
}

/**
 * Verifica si agregar un curso excede el límite de créditos.
 * Devuelve `true` si excede (conflicto).
 */
export function exceedsLimit(
  currentTotal: number,
  courseCredits: number,
  limit: number
): boolean {
  return currentTotal + courseCredits > limit;
}
