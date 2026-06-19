import { describe, it, expect } from "vitest";
import { splitFullName, joinFullName } from "@/lib/fullName";

describe("splitFullName", () => {
  it("devuelve vacío para una cadena vacía", () => {
    expect(splitFullName("")).toEqual({ nombres: "", apellidos: "" });
  });

  it("con un solo token lo trata como apellido", () => {
    expect(splitFullName("García")).toEqual({ nombres: "", apellidos: "García" });
  });

  it("con dos tokens los trata como apellidos", () => {
    expect(splitFullName("García López")).toEqual({ nombres: "", apellidos: "García López" });
  });

  it("con tres tokens usa el primero como nombre", () => {
    expect(splitFullName("Ana García López")).toEqual({ nombres: "Ana", apellidos: "García López" });
  });

  it("con cuatro tokens usa los dos primeros como nombres", () => {
    expect(splitFullName("Ana María García López")).toEqual({
      nombres: "Ana María",
      apellidos: "García López",
    });
  });

  it("agrupa partículas de nombre con el siguiente token", () => {
    expect(splitFullName("Ana de la Cruz Pérez")).toEqual({
      nombres: "Ana de la",
      apellidos: "Cruz Pérez",
    });
  });

  it("normaliza espacios múltiples", () => {
    expect(splitFullName("Ana   García   López")).toEqual({
      nombres: "Ana",
      apellidos: "García López",
    });
  });
});

describe("joinFullName", () => {
  it("une nombres y apellidos con un solo espacio", () => {
    expect(joinFullName("Ana", "García López")).toBe("Ana García López");
  });

  it("recorta espacios sobrantes en cada parte", () => {
    expect(joinFullName("  Ana  ", "  García  ")).toBe("Ana García");
  });

  it("colapsa espacios internos múltiples", () => {
    expect(joinFullName("Ana   María", "García")).toBe("Ana María García");
  });
});
