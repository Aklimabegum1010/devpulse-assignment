import { USER_ROLE, type Role } from "../types/index.js";

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidRole = (value: unknown): value is Role => {
  return value === USER_ROLE.contributor || value === USER_ROLE.maintainer;
};
