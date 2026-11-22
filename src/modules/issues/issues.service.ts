import { pool } from "../../db/index.js";
import AppError from "../../utils/AppError.js";
import {
  isNonEmptyString,
  isValidIssueType,
} from "../../utils/validators.js";
import type { ICreateIssuePayload } from "./issues.interface.js";

const createIssueIntoDB = async (
  payload: ICreateIssuePayload,
  reporterId: number,
) => {
  const { title, description, type } =
    payload ?? ({} as ICreateIssuePayload);

  const errors: string[] = [];

  if (!isNonEmptyString(title)) {
    errors.push("title is required");
  } else if (title.trim().length > 150) {
    errors.push("title must be at most 150 characters");
  }

  if (!isNonEmptyString(description)) {
    errors.push("description is required");
  } else if (description.trim().length < 20) {
    errors.push("description must be at least 20 characters");
  }

  if (!isValidIssueType(type)) {
    errors.push("type must be either bug or feature_request");
  }

  if (errors.length > 0) {
    throw new AppError(400, "Validation failed", errors);
  }

  const result = await pool.query(
    `
      INSERT INTO issues (title, description, type, reporter_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [title.trim(), description.trim(), type, reporterId],
  );

  return result.rows[0];
};

export const issuesService = {
  createIssueIntoDB,
};
