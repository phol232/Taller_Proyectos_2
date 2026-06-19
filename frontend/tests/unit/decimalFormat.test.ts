import { describe, it, expect } from "vitest";
import { formatDecimal, splitHoursInTenths } from "@/lib/decimalFormat";

describe("formatDecimal", () => {
  it("recorta ceros finales manteniendo al menos un decimal", () => {
    expect(formatDecimal(3)).toBe("3.0");
  });

  it("conserva decimales significativos", () => {
    expect(formatDecimal(3.5)).toBe("3.5");
  });

  it("recorta ceros sobrantes después del último decimal significativo", () => {
    expect(formatDecimal(3.25)).toBe("3.25");
    expect(formatDecimal(3.2500)).toBe("3.25");
  });

  it("redondea a 4 decimales antes de recortar", () => {
    expect(formatDecimal(1 / 3)).toBe("0.3333");
  });
});

describe("splitHoursInTenths", () => {
  it("divide horas pares en mitades iguales", () => {
    expect(splitHoursInTenths(4)).toEqual({ theoryHours: 2, practiceHours: 2 });
  });

  it("divide horas impares en décimas, favoreciendo teoría hacia abajo", () => {
    expect(splitHoursInTenths(3)).toEqual({ theoryHours: 1.5, practiceHours: 1.5 });
  });

  it("respeta el mínimo de 1 décima por componente con totales muy bajos", () => {
    expect(splitHoursInTenths(0.1)).toEqual({ theoryHours: 0.1, practiceHours: 0.1 });
  });

  it("redondea totales no exactos a la décima más cercana", () => {
    expect(splitHoursInTenths(3.04)).toEqual({ theoryHours: 1.5, practiceHours: 1.5 });
  });
});
