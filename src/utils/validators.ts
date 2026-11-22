import { ISSUE_STATUS, ISSUE_TYPE, USER_ROLE, type IssueStatus, type IssueType, type Role } from "../types/index.js";

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidRole = (value: unknown): value is Role => {
  return value === USER_ROLE.contributor || value === USER_ROLE.maintainer;
};

export const isValidIssueType = (value: unknown): value is IssueType => {
  return value === ISSUE_TYPE.bug || value === ISSUE_TYPE.feature_request;
};

export const isValidIssueStatus = (value: unknown): value is IssueStatus => {
  return (
    value === ISSUE_STATUS.open ||
    value === ISSUE_STATUS.in_progress ||
    value === ISSUE_STATUS.resolved
  );
};
