import { describe, expect, it } from "vitest";
import { academicPeriodSchema } from "@/lib/validators/academic-period.schema";
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
