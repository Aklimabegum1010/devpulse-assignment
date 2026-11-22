import type { Request, Response } from "express";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { issuesService } from "./issues.service.js";
import type { IIssueQuery } from "./issues.interface.js";

const createIssue = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Unauthorized: token is missing");
  }

  const result = await issuesService.createIssueIntoDB(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Issue created successfully",
    data: result,
  });
});

const getAllIssues = catchAsync(async (req: Request, res: Response) => {
  const result = await issuesService.getAllIssuesFromDB(
    req.query as unknown as IIssueQuery,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Issues retrived successfully",
    data: result,
  });
});

const getSingleIssue = catchAsync(async (req: Request, res: Response) => {
  const result = await issuesService.getSingleIssueFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Issue retrived successfully",
    data: result,
  });
});

const updateIssue = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Unauthorized: token is missing");
  }

  const result = await issuesService.updateIssueIntoDB(
    req.params.id as string,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Issue updated successfully",
    data: result,
  });
});

const deleteIssue = catchAsync(async (req: Request, res: Response) => {
  await issuesService.deleteIssueFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Issue deleted successfully",
  });
});

export const issuesController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
