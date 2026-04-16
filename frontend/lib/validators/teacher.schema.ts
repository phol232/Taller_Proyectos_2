import { z } from "zod";

export const teacherSchema = z.object({
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  name: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  specialty: z
    .string()
    .min(2, "La especialidad es obligatoria")
    .max(100, "Máximo 100 caracteres"),
});

export type TeacherFormValues = z.infer<typeof teacherSchema>;
