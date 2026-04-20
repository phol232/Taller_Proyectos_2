import api from "@/lib/api";
import type { SexType, ProfileResponse } from "@/types/entities";

export interface UpsertProfilePayload {
  dni:   string | null;
  phone: string | null;
  sex:   SexType | null;
  age:   number | null;
}

export const profileApi = {
  /** GET /api/profile/me */
  getMe(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>("/api/profile/me").then(r => r.data);
  },

  /** PUT /api/profile/me */
  upsertMe(payload: UpsertProfilePayload): Promise<ProfileResponse> {
    return api.put<ProfileResponse>("/api/profile/me", payload).then(r => r.data);
  },
};
