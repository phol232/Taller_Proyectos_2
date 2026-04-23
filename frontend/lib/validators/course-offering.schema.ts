import { z } from "zod";

const candidateSchema = z.object({
  teacherId: z.string().uuid("El docente candidato debe ser un UUID válido"),
  priorityWeight: z.number().min(0, "La prioridad no puede ser negativa"),
});

const sectionSchema = z.object({
  sectionCode: z.string().min(1, "El código de sección es obligatorio").max(20, "Máximo 20 caracteres"),
  vacancyLimit: z.number().int().min(1, "La vacante debe ser mayor a 0"),
  status: z.enum(["DRAFT", "ACTIVE", "CANCELLED"]),
  teacherCandidates: z.array(candidateSchema).default([]),
});

export const courseOfferingSchema = z.object({
  academicPeriodId: z.string().uuid("El período académico debe ser válido"),
  courseId: z.string().uuid("El curso debe ser válido"),
  expectedEnrollment: z.number().int().min(0, "La matrícula esperada no puede ser negativa"),
  status: z.enum(["DRAFT", "ACTIVE", "CANCELLED"]),
  sections: z.array(sectionSchema).default([]),
});

export type CourseOfferingFormValues = z.infer<typeof courseOfferingSchema>;
