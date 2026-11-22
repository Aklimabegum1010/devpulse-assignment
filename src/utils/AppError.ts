class AppError extends Error {
  public statusCode: number;
  public errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
