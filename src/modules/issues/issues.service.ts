import { pool } from "../../db/index.js";
import AppError from "../../utils/AppError.js";
import {
  isNonEmptyString,
  isValidIssueStatus,
  isValidIssueType,
} from "../../utils/validators.js";
import type { ICreateIssuePayload, IIssueQuery } from "./issues.interface.js";

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

const getAllIssuesFromDB = async (query: IIssueQuery) => {
  const { sort, type, status } = query;

  const errors: string[] = [];

  if (sort !== undefined && sort !== "newest" && sort !== "oldest") {
    errors.push("sort must be either newest or oldest");
  }
  if (type !== undefined && !isValidIssueType(type)) {
    errors.push("type must be either bug or feature_request");
  }
  if (status !== undefined && !isValidIssueStatus(status)) {
    errors.push("status must be one of open, in_progress, resolved");
  }

  if (errors.length > 0) {
    throw new AppError(400, "Validation failed", errors);
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const order = sort === "oldest" ? "ASC" : "DESC";

  const issuesResult = await pool.query(
    `SELECT * FROM issues ${whereClause} ORDER BY created_at ${order}`,
    values,
  );

  const issues = issuesResult.rows;

  if (issues.length === 0) {
    return [];
  }

  // No JOIN: collect reporter ids, then fetch reporters in one separate query.
  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];

  const reportersResult = await pool.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [reporterIds],
  );

  const reportersById = new Map(
    reportersResult.rows.map((reporter) => [reporter.id, reporter]),
  );

  return issues.map((issue) => {
    const { reporter_id, ...issueData } = issue;

    return {
      ...issueData,
      reporter: reportersById.get(reporter_id) ?? null,
    };
  });
};

export const issuesService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
};
