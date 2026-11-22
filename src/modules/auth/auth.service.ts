import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { pool } from "../../db/index.js";
import config from "../../config/index.js";
import AppError from "../../utils/AppError.js";
import { isNonEmptyString, isValidEmail, isValidRole } from "../../utils/validators.js";
import type { ILoginPayload, ISignupPayload } from "./auth.interface.js";

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

const loginUserIntoDB = async (payload: ILoginPayload) => {
  const { email, password } = payload ?? ({} as ILoginPayload);

  const errors: string[] = [];

  if (!isNonEmptyString(email) || !isValidEmail(email)) {
    errors.push("a valid email is required");
  }
  if (!isNonEmptyString(password)) {
    errors.push("password is required");
  }

  if (errors.length > 0) {
    throw new AppError(400, "Validation failed", errors);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    normalizedEmail,
  ]);

  const user = result.rows[0];

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid email or password");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(jwtPayload, config.jwt_secret, {
    expiresIn: config.jwt_expires_in as SignOptions["expiresIn"],
  });

  delete user.password;

  return { token, user };
};

export const authService = {
  signupUserIntoDB,
  loginUserIntoDB,
};
