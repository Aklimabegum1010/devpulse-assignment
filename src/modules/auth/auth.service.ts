import bcrypt from "bcryptjs";
import { pool } from "../../db/index.js";
import AppError from "../../utils/AppError.js";
import { isNonEmptyString, isValidEmail, isValidRole } from "../../utils/validators.js";
import type { ISignupPayload } from "./auth.interface.js";

const signupUserIntoDB = async (payload: ISignupPayload) => {
  const { name, email, password, role } = payload ?? ({} as ISignupPayload);

  const errors: string[] = [];

  if (!isNonEmptyString(name)) {
    errors.push("name is required");
  }
  if (!isNonEmptyString(email) || !isValidEmail(email)) {
    errors.push("a valid email is required");
  }
  if (!isNonEmptyString(password)) {
    errors.push("password is required");
  }
  if (role !== undefined && !isValidRole(role)) {
    errors.push("role must be either contributor or maintainer");
  }

  if (errors.length > 0) {
    throw new AppError(400, "Validation failed", errors);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [normalizedEmail],
  );

  if (existingUser.rowCount && existingUser.rowCount > 0) {
    throw new AppError(400, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, COALESCE($4, 'contributor'))
      RETURNING id, name, email, role, created_at, updated_at
    `,
    [name.trim(), normalizedEmail, hashedPassword, role ?? null],
  );

  return result.rows[0];
};

export const authService = {
  signupUserIntoDB,
};
