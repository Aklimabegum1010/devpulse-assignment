import { Router } from "express";
import auth from "../../middleware/auth.js";
import { USER_ROLE } from "../../types/index.js";
import { issuesController } from "./issues.controller.js";

const router = Router();

router.post("/", auth(), issuesController.createIssue);
router.get("/", issuesController.getAllIssues);
router.get("/:id", issuesController.getSingleIssue);
router.patch("/:id", auth(), issuesController.updateIssue);
router.delete(
  "/:id",
  auth(USER_ROLE.maintainer),
  issuesController.deleteIssue,
);

export const issuesRoute = router;
