import type { Role } from "./index.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        role: Role;
      };
    }
  }
}

export {};
