import { describe, expect, it } from "vitest";
import { academicPeriodSchema } from "@/lib/validators/academic-period.schema";
import { courseOfferingSchema } from "@/lib/validators/course-offering.schema";
import { getApiErrorMessage } from "@/lib/adminApi";

describe("academicPeriodSchema", () => {
  it("acepta un período académico válido", () => {
    const result = academicPeriodSchema.safeParse({
      code: "2026-1",
      name: "2026 - Semestre 1",
      startsAt: "2026-03-15",
      endsAt: "2026-07-30",
      status: "ACTIVE",
      maxStudentCredits: 22,
    });

    expect(result.success).toBe(true);
  });

  it("rechaza rangos inválidos", () => {
    const result = academicPeriodSchema.safeParse({
      code: "2026-1",
      name: "2026 - Semestre 1",
      startsAt: "2026-08-01",
      endsAt: "2026-07-30",
      status: "ACTIVE",
      maxStudentCredits: 22,
    });

    expect(result.success).toBe(false);
  });
});

describe("courseOfferingSchema", () => {
  it("acepta una oferta con secciones y candidatos", () => {
    const result = courseOfferingSchema.safeParse({
      academicPeriodId: "11111111-1111-4111-8111-111111111111",
      courseId: "22222222-2222-4222-8222-222222222222",
      expectedEnrollment: 45,
      status: "DRAFT",
      sections: [
        {
          sectionCode: "A",
          vacancyLimit: 25,
          status: "ACTIVE",
          teacherCandidates: [
            {
              teacherId: "33333333-3333-4333-8333-333333333333",
              priorityWeight: 1.5,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza candidatos con teacherId inválido", () => {
    const result = courseOfferingSchema.safeParse({
      academicPeriodId: "11111111-1111-4111-8111-111111111111",
      courseId: "22222222-2222-4222-8222-222222222222",
      expectedEnrollment: 45,
      status: "DRAFT",
      sections: [
        {
          sectionCode: "A",
          vacancyLimit: 25,
          status: "ACTIVE",
          teacherCandidates: [
            {
              teacherId: "sin-uuid",
              priorityWeight: 1,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("getApiErrorMessage", () => {
  it("prioriza el mensaje del backend", () => {
    expect(
      getApiErrorMessage(
        { response: { data: { message: "Código duplicado" } } },
        "Fallback"
      )
    ).toBe("Código duplicado");
  });

  it("usa el fallback cuando no hay detalles", () => {
    expect(getApiErrorMessage({}, "Fallback")).toBe("Fallback");
  });
});
