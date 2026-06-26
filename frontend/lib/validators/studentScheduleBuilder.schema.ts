import { z } from "zod";

export const studentBuilderAddCourseSchema = z.object({
  courseId: z.string().uuid("Curso inválido"),
  assignmentIds: z.array(z.string().uuid()).min(1, "Selecciona una sección válida"),
});

export type StudentBuilderAddCourseInput = z.infer<typeof studentBuilderAddCourseSchema>;
