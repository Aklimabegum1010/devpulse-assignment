import type { Role } from "../../types/index.js";

export interface ISignupPayload {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface ILoginPayload {
  email: string;
  password: string;
}
