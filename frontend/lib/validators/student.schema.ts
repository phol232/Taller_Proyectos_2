import { z } from "zod";

export const studentSchema = z.object({
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  name: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  cycle: z
    .number({ error: "El ciclo debe ser un número" })
    .int()
    .min(1, "El ciclo mínimo es 1")
    .max(12, "El ciclo máximo es 12"),
  career: z
    .string()
    .min(2, "La carrera es obligatoria")
    .max(100, "Máximo 100 caracteres"),
  approvedCourses: z.array(z.string()).default([]),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
