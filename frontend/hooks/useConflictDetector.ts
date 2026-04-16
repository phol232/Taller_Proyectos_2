"use client";

import { useCallback } from "react";
import {
  findTeacherOverlaps,
  findClassroomOverlaps,
} from "@/lib/schedule/overlap";
import type { Assignment, Conflict } from "@/types/schedule";

/**
 * Detecta solapamientos en el horario docente en tiempo real.
 * RF-08, RF-10 — validación ≤1 s tras cada acción.
 */
export function useConflictDetector() {
  const detect = useCallback((assignments: Assignment[]): Conflict[] => {
    const conflicts: Conflict[] = [];

    const teacherOverlaps = findTeacherOverlaps(assignments);
    for (const [a, b] of teacherOverlaps) {
      conflicts.push({
        type: "overlap_teacher",
        message: `Solapamiento de docente: ${a.courseCode} y ${b.courseCode}`,
        resource: a.teacherId,
        timeSlot: a.timeSlot,
        details: `${a.timeSlot.day} ${a.timeSlot.startTime}–${a.timeSlot.endTime}`,
      });
    }

    const classroomOverlaps = findClassroomOverlaps(assignments);
    for (const [a, b] of classroomOverlaps) {
      conflicts.push({
        type: "overlap_classroom",
        message: `Solapamiento de aula: ${a.courseCode} y ${b.courseCode}`,
        resource: a.classroomId,
        timeSlot: a.timeSlot,
        details: `${a.timeSlot.day} ${a.timeSlot.startTime}–${a.timeSlot.endTime}`,
      });
    }

    return conflicts;
  }, []);

  return { detect };
}
