// @ts-nocheck
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import performanceRouter from "./performance";
import roadmapRouter from "./roadmap";
import githubRouter from "./github";
import githubAuthRouter from "./auth-github";
import workspacesRouter from "./workspaces";
import contributionsRouter from "./contributions";
import workspaceTasksRouter from "./workspace-tasks";
import githubStatsRouter from "./github-stats";
import sprintsRouter from "./sprints";
import manualLogsRouter from "./manual-logs";
import suggestionsRouter from "./suggestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/auth", githubAuthRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/performance", performanceRouter);
router.use("/roadmap", roadmapRouter);
router.use("/github", githubRouter);
router.use("/workspaces", workspacesRouter);
router.use("/contributions", contributionsRouter);
router.use("/workspace-tasks", workspaceTasksRouter);
router.use("/github-stats", githubStatsRouter);
router.use("/sprints", sprintsRouter);
router.use("/manual-logs", manualLogsRouter);
router.use("/suggestions", suggestionsRouter);

export default router;
