import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TERMINAL_RUN_STATUSES,
  buildGenerateHref,
  buildScheduleViewHref,
  delay,
  formatDateTime,
  formatTermination,
  parseGenerateStep,
  parseGenerateWizardParams,
  parseSolverSummary,
  safeInternalReturnTo,
} from "@/lib/schedule/generationUtils";

describe("parseGenerateStep", () => {
  it("acepta pasos válidos del wizard", () => {
    expect(parseGenerateStep("1")).toBe(1);
    expect(parseGenerateStep("4")).toBe(4);
  });

  it("rechaza valores inválidos", () => {
    expect(parseGenerateStep("0")).toBeNull();
    expect(parseGenerateStep("5")).toBeNull();
    expect(parseGenerateStep(null)).toBeNull();
    expect(parseGenerateStep("x")).toBeNull();
  });
});

describe("parseGenerateWizardParams", () => {
  it("parsea query params del wizard", () => {
    const params = new URLSearchParams(
      "returnFrom=view&academicPeriodId=period-1&carreraId=car-1&classroomIds= a-1 , a-2 ",
    );

    expect(parseGenerateWizardParams(params)).toEqual({
      returnFrom: "view",
      academicPeriodId: "period-1",
      carreraId: "car-1",
      classroomIds: ["a-1", "a-2"],
    });
  });

  it("omite valores vacíos", () => {
    const params = new URLSearchParams("academicPeriodId=&carreraId=&classroomIds=,,");
    expect(parseGenerateWizardParams(params)).toEqual({});
  });
});

describe("buildGenerateHref", () => {
  it("construye href con query string", () => {
    expect(
      buildGenerateHref("/coordinator/schedule/generate", {
        returnFrom: "view",
        academicPeriodId: "period-1",
        classroomIds: ["a-1", "a-2"],
      }),
    ).toBe(
      "/coordinator/schedule/generate?returnFrom=view&academicPeriodId=period-1&classroomIds=a-1%2Ca-2",
    );
  });

  it("devuelve solo la ruta base sin parámetros", () => {
    expect(buildGenerateHref("/admin/schedule/generate", {})).toBe("/admin/schedule/generate");
  });
});

describe("safeInternalReturnTo", () => {
  it("acepta rutas internas relativas", () => {
    expect(safeInternalReturnTo("/coordinator/schedule/view")).toBe("/coordinator/schedule/view");
  });

  it("rechaza URLs externas o protocol-relative", () => {
    expect(safeInternalReturnTo("//evil.com")).toBeNull();
    expect(safeInternalReturnTo("https://evil.com")).toBeNull();
    expect(safeInternalReturnTo(null)).toBeNull();
  });
});

describe("buildScheduleViewHref", () => {
  it("incluye scheduleId y returnTo opcional", () => {
    expect(buildScheduleViewHref("/view", "schedule-1", "/back")).toBe(
      "/view?scheduleId=schedule-1&returnTo=%2Fback",
    );
    expect(buildScheduleViewHref("/view", "schedule-1")).toBe("/view?scheduleId=schedule-1");
  });
});

describe("formatDateTime", () => {
  it("formatea fechas ISO en español", () => {
    const formatted = formatDateTime("2026-05-18T10:30:00.000Z");
    expect(formatted).not.toBe("—");
    expect(formatted.length).toBeGreaterThan(5);
  });

  it("devuelve guión para valores vacíos", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resuelve después del tiempo indicado", async () => {
    const promise = delay(500);
    vi.advanceTimersByTime(500);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("parseSolverSummary", () => {
  it("parsea métricas del resumen del solver", () => {
    expect(
      parseSolverSummary(
        "duration_ms=1000;total_duration_ms=2000;attempts=3;total_attempts=5;candidates=10;total_candidates=20;room_gaps=1;room_gap_minutes=15;weekend_blocks=2;termination=TIME_LIMIT_REACHED",
      ),
    ).toEqual({
      durationMs: 2000,
      attempts: 5,
      candidates: 20,
      roomGaps: 1,
      roomGapMinutes: 15,
      weekendBlocks: 2,
      termination: "TIME_LIMIT_REACHED",
    });
  });

  it("devuelve métricas nulas cuando no hay resumen", () => {
    expect(parseSolverSummary(null)).toEqual({
      durationMs: null,
      attempts: null,
      candidates: null,
      roomGaps: null,
      roomGapMinutes: null,
      weekendBlocks: null,
      termination: null,
    });
  });
});

describe("formatTermination", () => {
  it("traduce terminaciones conocidas", () => {
    expect(formatTermination("TIME_LIMIT_REACHED").label).toBe("Tiempo agotado");
    expect(formatTermination("LOCAL_SEARCH_COMPLETE").label).toBe("Solución encontrada");
    expect(formatTermination("OTHER").label).toBe("Finalizado");
  });
});

describe("TERMINAL_RUN_STATUSES", () => {
  it("incluye estados finales del run", () => {
    expect(TERMINAL_RUN_STATUSES.has("SUCCEEDED")).toBe(true);
    expect(TERMINAL_RUN_STATUSES.has("FAILED")).toBe(true);
    expect(TERMINAL_RUN_STATUSES.has("CANCELLED")).toBe(true);
    expect(TERMINAL_RUN_STATUSES.has("RUNNING")).toBe(false);
  });
});
