import { Router } from "express";
import auth from "../../middleware/auth.js";
import { issuesController } from "./issues.controller.js";

const router = Router();

router.post("/", auth(), issuesController.createIssue);
router.get("/", issuesController.getAllIssues);
router.get("/:id", issuesController.getSingleIssue);
router.patch("/:id", auth(), issuesController.updateIssue);

export const issuesRoute = router;
