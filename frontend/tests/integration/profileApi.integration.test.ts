import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import { profileApi } from "@/lib/profileApi";
import type { ProfileResponse } from "@/types/entities";
import type { UpsertProfilePayload } from "@/lib/profileApi";

const makeProfile = (userId = "user-1"): ProfileResponse => ({
  id: "profile-1",
  userId,
  fullName: "Estudiante Test",
  email: "estudiante@continental.edu.pe",
  role: "STUDENT",
  dni: "12345678",
  phone: "999000111",
  sex: "MALE",
  age: 22,
  facultadId: "fac-1",
  carreraId: "car-1",
  preferredShifts: ["MORNING"],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const makeUpsertPayload = (): UpsertProfilePayload => ({
  dni: "12345678",
  phone: "999000111",
  sex: "MALE",
  age: 22,
  facultadId: "fac-1",
  carreraId: "car-1",
  preferredShifts: ["MORNING"],
});

describe("profileApi — integración", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMe", () => {
    it("GET /api/profile/me — retorna perfil del usuario autenticado", async () => {
      const profile = makeProfile();
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: profile });

      await expect(profileApi.getMe()).resolves.toEqual(profile);
      expect(spy).toHaveBeenCalledWith("/api/profile/me");
    });

    it("GET /api/profile/me — retorna perfil con campos opcionales en null", async () => {
      const profile: ProfileResponse = {
        ...makeProfile(),
        dni: null,
        phone: null,
        sex: null,
        age: null,
        facultadId: null,
        carreraId: null,
        preferredShifts: [],
      };
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: profile });

      const result = await profileApi.getMe();
      expect(result.dni).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.preferredShifts).toEqual([]);
      expect(spy).toHaveBeenCalledWith("/api/profile/me");
    });

    it("GET /api/profile/me — propaga el error cuando falla la petición", async () => {
      const error = new Error("Network Error");
      vi.spyOn(api, "get").mockRejectedValue(error);

      await expect(profileApi.getMe()).rejects.toThrow("Network Error");
    });
  });

  describe("upsertMe", () => {
    it("PUT /api/profile/me — actualiza el perfil con payload completo", async () => {
      const profile = makeProfile();
      const payload = makeUpsertPayload();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: profile });

      await expect(profileApi.upsertMe(payload)).resolves.toEqual(profile);
      expect(spy).toHaveBeenCalledWith("/api/profile/me", payload);
    });

    it("PUT /api/profile/me — envía payload con turnos preferidos múltiples", async () => {
      const profile = makeProfile();
      const payload: UpsertProfilePayload = {
        ...makeUpsertPayload(),
        preferredShifts: ["MORNING", "AFTERNOON"],
      };
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: profile });

      await expect(profileApi.upsertMe(payload)).resolves.toEqual(profile);
      expect(spy).toHaveBeenCalledWith("/api/profile/me", expect.objectContaining({
        preferredShifts: ["MORNING", "AFTERNOON"],
      }));
    });

    it("PUT /api/profile/me — envía payload con campos opcionales en null", async () => {
      const profile = makeProfile();
      const payload: UpsertProfilePayload = {
        dni: null,
        phone: null,
        sex: null,
        age: null,
        facultadId: null,
        carreraId: null,
        preferredShifts: [],
      };
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: profile });

      await profileApi.upsertMe(payload);
      expect(spy).toHaveBeenCalledWith("/api/profile/me", payload);
    });

    it("PUT /api/profile/me — propaga el error cuando falla la petición", async () => {
      const error = new Error("Validation Error");
      vi.spyOn(api, "put").mockRejectedValue(error);

      await expect(profileApi.upsertMe(makeUpsertPayload())).rejects.toThrow("Validation Error");
    });
  });
});
