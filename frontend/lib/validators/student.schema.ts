import { z } from "zod";

export const studentSchema = z.object({
  userId: z.string().uuid("El usuario debe ser un UUID válido").optional().nullable().or(z.literal("")),
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  fullName: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  cycle: z
    .number({ error: "El ciclo debe ser un número" })
    .int()
    .min(1, "El ciclo mínimo es 1"),
  career: z
    .string()
    .max(255, "Máximo 255 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  facultadId: z.string().uuid("La facultad debe ser un UUID válido").optional().nullable().or(z.literal("")),
  carreraId: z.string().uuid("La carrera debe ser un UUID válido").optional().nullable().or(z.literal("")),
  creditLimit: z
    .number({ error: "El límite de créditos debe ser un número" })
    .int()
    .min(1, "El límite de créditos debe ser mayor a 0"),
  isActive: z.boolean().default(true),
  approvedCourses: z.array(z.string()).default([]),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
