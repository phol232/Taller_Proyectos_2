import { z } from "zod";

export const academicPeriodSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(50, "Máximo 50 caracteres"),
  name: z.string().min(2, "El nombre es obligatorio").max(150, "Máximo 150 caracteres"),
  startsAt: z.string().min(1, "La fecha de inicio es obligatoria"),
  endsAt: z.string().min(1, "La fecha de fin es obligatoria"),
  status: z.enum(["PLANNING", "ACTIVE", "CLOSED"]),
  maxStudentCredits: z.number().int().min(1, "Debe ser mayor a 0"),
}).refine((value) => value.endsAt >= value.startsAt, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio",
  path: ["endsAt"],
});

export type AcademicPeriodFormValues = z.infer<typeof academicPeriodSchema>;
