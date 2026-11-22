import type { IssueStatus, IssueType } from "../../types/index.js";

export interface ICreateIssuePayload {
  title: string;
  description: string;
  type: IssueType;
}

export interface IUpdateIssuePayload {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
}

export interface IIssueQuery {
  sort?: string;
  type?: string;
  status?: string;
}
