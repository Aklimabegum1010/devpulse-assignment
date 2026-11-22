import type { Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/index.js";
import { pool } from "../db/index.js";
import type { Role } from "../types/index.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

const auth = (...roles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new AppError(401, "Unauthorized: token is missing");
    }

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : authorization.trim();

    if (!token) {
      throw new AppError(401, "Unauthorized: token is missing");
    }

    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
    } catch {
      throw new AppError(401, "Unauthorized: invalid or expired token");
    }

    const result = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1`,
      [decoded.id],
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError(401, "Unauthorized: user no longer exists");
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new AppError(
        403,
        "Forbidden: you do not have permission to perform this action",
      );
    }

    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    next();
  });
};

export default auth;
