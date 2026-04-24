import type { Role } from "./entities";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface AuthUserResponse {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: Role | string;
  avatarUrl?: string | null;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: Role;
  exp: number;
  iat: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUserResponse;
}
