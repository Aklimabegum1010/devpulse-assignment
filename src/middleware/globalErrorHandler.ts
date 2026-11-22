import type { NextFunction, Request, Response } from "express";
import AppError from "../utils/AppError.js";

const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors ?? err.message,
    });
  }

  const error = err as Error;
  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: error?.message ?? "Something went wrong",
  });
};

export default globalErrorHandler;
