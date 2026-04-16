"use client";

import { useCallback } from "react";
import { timeSlotsOverlap } from "@/lib/schedule/overlap";
import { getMissingPrerequisites } from "@/lib/schedule/prerequisites";
import { exceedsLimit } from "@/lib/schedule/credits";
import type { Assignment, Conflict, TimeSlot } from "@/types/schedule";

interface ValidationInput {
  newCourseId: string;
  newTimeSlot: TimeSlot;
  newCredits: number;
  prerequisites: string[];
  approvedCourses: string[];
  currentAssignments: Assignment[];
  currentTotalCredits: number;
  creditLimit: number;
  vacancies: number;
}

/**
 * Valida en tiempo real las 4 restricciones del horario del estudiante.
 * (RF-13, RF-14): prerrequisitos, créditos, vacantes, solapamiento.
 * Retorna la lista de conflictos (vacía = sin conflictos).
 */
export function useScheduleValidation() {
  const validate = useCallback(
    ({
      newCourseId,
      newTimeSlot,
      newCredits,
      prerequisites,
      approvedCourses,
      currentAssignments,
      currentTotalCredits,
      creditLimit,
      vacancies,
    }: ValidationInput): Conflict[] => {
      const conflicts: Conflict[] = [];

      // 1. Prerrequisitos (RF-05, RF-14)
      const missing = getMissingPrerequisites(prerequisites, approvedCourses);
      if (missing.length > 0) {
        conflicts.push({
          type: "prerequisite_missing",
          message: `Prerrequisitos faltantes: ${missing.join(", ")}`,
          resource: newCourseId,
        });
      }

      // 2. Límite de créditos (RF-13, RF-14)
      if (exceedsLimit(currentTotalCredits, newCredits, creditLimit)) {
        conflicts.push({
          type: "credits_exceeded",
          message: `Se excedería el límite de créditos (${currentTotalCredits + newCredits} / ${creditLimit})`,
          resource: newCourseId,
        });
      }

      // 3. Vacantes (RF-14)
      if (vacancies <= 0) {
        conflicts.push({
          type: "no_vacancy",
          message: "No hay vacantes disponibles en esta sección",
          resource: newCourseId,
        });
      }

      // 4. Solapamiento con asignaciones existentes (RF-14)
      for (const existing of currentAssignments) {
        if (timeSlotsOverlap(newTimeSlot, existing.timeSlot)) {
          conflicts.push({
            type: "overlap_student",
            message: `Solapamiento con ${existing.courseCode} — ${existing.timeSlot.day} ${existing.timeSlot.startTime}–${existing.timeSlot.endTime}`,
            resource: existing.courseId,
            timeSlot: existing.timeSlot,
          });
        }
      }

      return conflicts;
    },
    []
  );

  return { validate };
}
