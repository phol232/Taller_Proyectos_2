import { z } from "zod";

export const courseSchema = z.object({
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  name: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  credits: z
    .number({ error: "Los créditos deben ser un número" })
    .int()
    .min(1, "Mínimo 1 crédito")
    .max(6, "Máximo 6 créditos"),
  weeklyHours: z
    .number({ error: "Las horas deben ser un número" })
    .int()
    .min(1, "Mínimo 1 hora semanal"),
  prerequisites: z.array(z.string()).default([]),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
