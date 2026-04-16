/**
 * Verifica si todos los prerrequisitos de un curso han sido aprobados.
 * Devuelve la lista de prerrequisitos faltantes.
 * RF-05, RF-13, RF-14
 */
export function getMissingPrerequisites(
  coursePrerequisites: string[],
  approvedCourses: string[]
): string[] {
  const approvedSet = new Set(approvedCourses);
  return coursePrerequisites.filter((prereq) => !approvedSet.has(prereq));
}

/**
 * Devuelve `true` si todos los prerrequisitos están aprobados.
 */
export function hasAllPrerequisites(
  coursePrerequisites: string[],
  approvedCourses: string[]
): boolean {
  return getMissingPrerequisites(coursePrerequisites, approvedCourses).length === 0;
}
