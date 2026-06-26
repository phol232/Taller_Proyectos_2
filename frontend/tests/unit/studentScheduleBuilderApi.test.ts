import { describe, expect, it, vi, beforeEach } from "vitest";
import api from "@/lib/api";
import {
  addStudentBuilderCourse,
  ensureStudentBuilderDraft,
  getStudentBuilderDraft,
  importStudentBuilderFromOption,
  removeStudentBuilderCourse,
  renewStudentBuilderDraft,
  validateStudentBuilderCourse,
} from "@/lib/studentScheduleBuilderApi";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("studentScheduleBuilderApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStudentBuilderDraft devuelve null en 204", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: null, status: 204 });
    const result = await getStudentBuilderDraft("s1", "p1");
    expect(result).toBeNull();
  });

  it("ensureStudentBuilderDraft devuelve scheduleId", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { scheduleId: "sch-1" } });
    const id = await ensureStudentBuilderDraft("s1", "p1");
    expect(id).toBe("sch-1");
  });

  it("validateStudentBuilderCourse mapea conflictos", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: [{ conflictType: "OVERLAP", message: "Solapamiento", resourceId: "c1" }],
    });
    const conflicts = await validateStudentBuilderCourse("s1", "sch", "c1", ["a1"]);
    expect(conflicts[0].type).toBe("overlap_student");
    expect(conflicts[0].message).toBe("Solapamiento");
  });

  it("addStudentBuilderCourse devuelve itemId", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { itemId: "item-1" } });
    const id = await addStudentBuilderCourse("s1", "sch", "c1", ["a1"]);
    expect(id).toBe("item-1");
  });

  it("getStudentBuilderDraft acepta opciones con scheduleId", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { scheduleId: "sch-9" }, status: 200 });
    const result = await getStudentBuilderDraft("s1", { scheduleId: "sch-9" });
    expect(result).toEqual({ scheduleId: "sch-9" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/students/s1/schedule/builder",
      expect.objectContaining({ params: { scheduleId: "sch-9" } }),
    );
  });

  it("getStudentBuilderDraft acepta opciones con periodId", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { scheduleId: "sch-2" }, status: 200 });
    await getStudentBuilderDraft("s1", { periodId: "p9" });
    expect(api.get).toHaveBeenCalledWith(
      "/api/students/s1/schedule/builder",
      expect.objectContaining({ params: { periodId: "p9" } }),
    );
  });

  it.each([
    ["PREREQUISITE_MISSING", "prerequisite_missing"],
    ["CREDITS_EXCEEDED", "credits_exceeded"],
    ["NO_VACANCY", "no_vacancy"],
    ["DUPLICATE_COURSE", "overlap_student"],
    ["UNKNOWN", "overlap_student"],
  ])("validateStudentBuilderCourse mapea %s -> %s", async (input, expected) => {
    vi.mocked(api.post).mockResolvedValue({
      data: [{ conflictType: input, message: "x", resourceId: null }],
    });
    const conflicts = await validateStudentBuilderCourse("s1", "sch", "c1", ["a1"]);
    expect(conflicts[0].type).toBe(expected);
    expect(conflicts[0].resource).toBeUndefined();
  });

  it("removeStudentBuilderCourse llama al endpoint con scheduleId", async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null });
    await removeStudentBuilderCourse("s1", "sch", "c1");
    expect(api.delete).toHaveBeenCalledWith(
      "/api/students/s1/schedule/builder/courses/c1",
      expect.objectContaining({ params: { scheduleId: "sch" } }),
    );
  });

  it("renewStudentBuilderDraft llama al endpoint de renovación", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null });
    await renewStudentBuilderDraft("s1", "sch");
    expect(api.post).toHaveBeenCalledWith(
      "/api/students/s1/schedule/builder/renew",
      null,
      expect.objectContaining({ params: { scheduleId: "sch" } }),
    );
  });

  it("importStudentBuilderFromOption devuelve el nuevo scheduleId", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { scheduleId: "sch-import" } });
    const id = await importStudentBuilderFromOption("s1", "p1", "src-1");
    expect(id).toBe("sch-import");
    expect(api.post).toHaveBeenCalledWith(
      "/api/students/s1/schedule/builder/import",
      { sourceScheduleId: "src-1" },
      expect.objectContaining({ params: { periodId: "p1" } }),
    );
  });
});
