import { describe, it, expect } from "vitest";
import {
  getMissingPrerequisites,
  hasAllPrerequisites,
} from "@/lib/schedule/prerequisites";

describe("getMissingPrerequisites", () => {
  it("devuelve vacío cuando todos están aprobados", () => {
    expect(
      getMissingPrerequisites(["CALC-1", "FIS-1"], ["CALC-1", "FIS-1", "MAT-1"])
    ).toEqual([]);
  });

  it("identifica los prerrequisitos faltantes", () => {
    expect(
      getMissingPrerequisites(["CALC-1", "FIS-1"], ["CALC-1"])
    ).toEqual(["FIS-1"]);
  });

  it("devuelve todos si ninguno está aprobado", () => {
    expect(
      getMissingPrerequisites(["CALC-1", "FIS-1"], [])
    ).toEqual(["CALC-1", "FIS-1"]);
  });

  it("devuelve vacío si el curso no tiene prerrequisitos", () => {
    expect(getMissingPrerequisites([], ["CALC-1"])).toEqual([]);
  });
});

describe("hasAllPrerequisites", () => {
  it("devuelve true cuando todos están aprobados", () => {
    expect(hasAllPrerequisites(["CALC-1"], ["CALC-1", "FIS-1"])).toBe(true);
  });

  it("devuelve false cuando falta alguno", () => {
    expect(hasAllPrerequisites(["CALC-1", "FIS-1"], ["CALC-1"])).toBe(false);
  });
});
