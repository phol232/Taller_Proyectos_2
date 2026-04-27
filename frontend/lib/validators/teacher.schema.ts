import { z } from "zod";

export const teacherSchema = z.object({
  userId: z.string().uuid("El usuario debe ser un UUID válido").optional().nullable().or(z.literal("")),
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  fullName: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  specialty: z
    .string()
    .min(2, "La especialidad es obligatoria")
    .max(255, "Máximo 255 caracteres"),
  isActive: z.boolean().default(true),
  courseCodes: z.array(z.string()).default([]),
  courseComponentIds: z.array(z.string().uuid()).default([]),
});

export type TeacherFormValues = z.infer<typeof teacherSchema>;
