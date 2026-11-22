import { pool } from "../../db/index.js";
import AppError from "../../utils/AppError.js";
import { ISSUE_STATUS, USER_ROLE, type Role } from "../../types/index.js";
import {
  isNonEmptyString,
  isValidIssueStatus,
  isValidIssueType,
} from "../../utils/validators.js";
import type {
  ICreateIssuePayload,
  IIssueQuery,
  IUpdateIssuePayload,
} from "./issues.interface.js";

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

const parseIssueId = (id: string) => {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, "Invalid issue id");
  }

  return parsed;
};

const getSingleIssueFromDB = async (id: string) => {
  const issueId = parseIssueId(id);

  const result = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
    issueId,
  ]);

  const issue = result.rows[0];

  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  const reporterResult = await pool.query(
    `SELECT id, name, role FROM users WHERE id = $1`,
    [issue.reporter_id],
  );

  const { reporter_id, ...issueData } = issue;

  return {
    ...issueData,
    reporter: reporterResult.rows[0] ?? null,
  };
};

const updateIssueIntoDB = async (
  id: string,
  payload: IUpdateIssuePayload,
  user: { id: number; role: Role },
) => {
  const issueId = parseIssueId(id);
  const { title, description, type, status } =
    payload ?? ({} as IUpdateIssuePayload);

  const existingResult = await pool.query(
    `SELECT * FROM issues WHERE id = $1`,
    [issueId],
  );

  const issue = existingResult.rows[0];

  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  if (user.role === USER_ROLE.contributor) {
    if (issue.reporter_id !== user.id) {
      throw new AppError(
        403,
        "Forbidden: you can only update your own issues",
      );
    }

    if (issue.status !== ISSUE_STATUS.open) {
      throw new AppError(
        409,
        "Only open issues can be updated by contributors",
      );
    }

    if (status !== undefined) {
      throw new AppError(
        403,
        "Forbidden: only maintainers can change the issue status",
      );
    }
  }

  if (
    title === undefined &&
    description === undefined &&
    type === undefined &&
    status === undefined
  ) {
    throw new AppError(
      400,
      "At least one field (title, description, type, status) is required",
    );
  }

  const errors: string[] = [];

  if (title !== undefined) {
    if (!isNonEmptyString(title)) {
      errors.push("title cannot be empty");
    } else if (title.trim().length > 150) {
      errors.push("title must be at most 150 characters");
    }
  }

  if (description !== undefined) {
    if (!isNonEmptyString(description)) {
      errors.push("description cannot be empty");
    } else if (description.trim().length < 20) {
      errors.push("description must be at least 20 characters");
    }
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

  const result = await pool.query(
    `
      UPDATE issues
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          status = COALESCE($4, status),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
    [
      title !== undefined ? title.trim() : null,
      description !== undefined ? description.trim() : null,
      type ?? null,
      status ?? null,
      issueId,
    ],
  );

  return result.rows[0];
};

export const issuesService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueIntoDB,
};
