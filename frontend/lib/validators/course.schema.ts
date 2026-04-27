import { z } from "zod";

export const courseComponentSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  componentType: z.enum(["GENERAL", "THEORY", "PRACTICE"]),
  weeklyHours: z
    .number({ error: "Las horas del componente deben ser un número" })
    .int()
    .min(1, "Mínimo 1 hora"),
  requiredRoomType: z
    .string()
    .trim()
    .min(1, "El tipo de aula del componente es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  sortOrder: z
    .number({ error: "El orden debe ser un número" })
    .int()
    .min(1, "Mínimo orden 1"),
  isActive: z.boolean().default(true),
});

export const courseSchema = z.object({
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  name: z
    .string()
    .min(2, "El nombre es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  cycle: z
    .number({ error: "El ciclo debe ser un número" })
    .int()
    .min(1, "Mínimo ciclo 1")
    .max(10, "Máximo ciclo 10")
    .default(1),
  credits: z
    .number({ error: "Los créditos deben ser un número" })
    .int()
    .min(1, "Mínimo 1 crédito")
    .max(6, "Máximo 6 créditos"),
  requiredCredits: z
    .number({ error: "Los créditos requeridos deben ser un número" })
    .int()
    .min(0, "No puede ser negativo")
    .default(0),
  weeklyHours: z
    .number({ error: "Las horas deben ser un número" })
    .int()
    .min(1, "Mínimo 1 hora semanal"),
  requiredRoomType: z
    .string()
    .trim()
    .min(1, "El tipo de aula requerido es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  isActive: z.boolean().default(true),
  components: z.array(courseComponentSchema).min(1, "Agrega al menos un componente"),
  prerequisites: z.array(z.string()).default([]),
}).superRefine((value, ctx) => {
  const generalCount = value.components.filter((component) => component.componentType === "GENERAL").length;
  const specificCount = value.components.length - generalCount;
  if (generalCount > 0 && specificCount > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["components"],
      message: "No mezcles General con Teoría/Práctica.",
    });
  }
  if (generalCount > 1) {
    ctx.addIssue({
      code: "custom",
      path: ["components"],
      message: "Solo puede existir un componente General.",
    });
  }
  const componentTypes = new Set(value.components.map((component) => component.componentType));
  if (componentTypes.size !== value.components.length) {
    ctx.addIssue({
      code: "custom",
      path: ["components"],
      message: "No repitas tipos de componente.",
    });
  }
  // Nota: no se valida que la suma de horas de componentes coincida con weeklyHours,
  // ya que ambos se gestionan de forma independiente (formulario curso vs modal Horarios).
});

export type CourseFormValues = z.infer<typeof courseSchema>;
