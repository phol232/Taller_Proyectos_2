import { z } from "zod";

export const classroomSchema = z.object({
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  name: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  capacity: z
    .number({ error: "La capacidad debe ser un número" })
    .int()
    .min(1, "La capacidad debe ser mayor a 0"),
  type: z
    .string()
    .min(2, "El tipo es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  isActive: z.boolean().default(true),
});

export type ClassroomFormValues = z.infer<typeof classroomSchema>;
