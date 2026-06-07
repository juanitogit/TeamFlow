// @ts-nocheck
import { Router, Response } from "express";
import { db, projectsTable, tasksTable, usersTable } from "@workspace/db";
import { eq, count, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res: Response) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  const result = await Promise.all(projects.map(async (p) => {
    const tasks = await db.select({ id: tasksTable.id, status: tasksTable.status, assigneeId: tasksTable.assigneeId })
      .from(tasksTable).where(eq(tasksTable.projectId, p.id));
    const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
    return {
      ...p,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter(t => t.status === "completed").length,
      memberCount: assigneeIds.length,
    };
  }));
  res.json(result);
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  if (req.userRole !== "leader") {
    res.status(403).json({ error: "Only team leaders can create projects" });
    return;
  }
  const parse = CreateProjectBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, description, githubRepoUrl, status } = parse.data;
  let githubRepoName: string | undefined;
  if (githubRepoUrl) {
    const match = githubRepoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    githubRepoName = match?.[1];
  }
  const [project] = await db.insert(projectsTable).values({
    name,
    description,
    githubRepoUrl,
    githubRepoName,
    status: (status as "active" | "completed" | "paused") || "active",
    leaderId: req.userId!,
  }).returning();
  res.status(201).json({ ...project, taskCount: 0, completedTaskCount: 0, memberCount: 0 });
});

router.get("/:projectId", async (req: AuthedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId as string);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const tasks = await db.select({ id: tasksTable.id, status: tasksTable.status, assigneeId: tasksTable.assigneeId })
    .from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
  res.json({
    ...project,
    taskCount: tasks.length,
    completedTaskCount: tasks.filter(t => t.status === "completed").length,
    memberCount: assigneeIds.length,
  });
});

router.patch("/:projectId", async (req: AuthedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId as string);
  const parse = UpdateProjectBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parse.data.name !== undefined) updates.name = parse.data.name;
  if (parse.data.description !== undefined) updates.description = parse.data.description;
  if (parse.data.status !== undefined) updates.status = parse.data.status;
  if (parse.data.githubRepoUrl !== undefined) {
    updates.githubRepoUrl = parse.data.githubRepoUrl;
    const match = parse.data.githubRepoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) updates.githubRepoName = match[1];
  }
  const [project] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, projectId)).returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const tasks = await db.select({ id: tasksTable.id, status: tasksTable.status, assigneeId: tasksTable.assigneeId })
    .from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
  res.json({ ...project, taskCount: tasks.length, completedTaskCount: tasks.filter(t => t.status === "completed").length, memberCount: assigneeIds.length });
});

router.delete("/:projectId", async (req: AuthedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId as string);
  await db.delete(tasksTable).where(eq(tasksTable.projectId, projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.status(204).send();
});

router.get("/:projectId/contributions/:period", async (req: AuthedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId as string);
  const tasks = await db.select({
    assigneeId: tasksTable.assigneeId,
    completedAt: tasksTable.completedAt,
    status: tasksTable.status,
    type: tasksTable.type,
  }).from(tasksTable).where(eq(tasksTable.projectId, projectId));

  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
  if (assigneeIds.length === 0) {
    res.json([]);
    return;
  }
  const users = await db.select({ id: usersTable.id, name: usersTable.name, githubUsername: usersTable.githubUsername })
    .from(usersTable).where(inArray(usersTable.id, assigneeIds));

  const result = users.map(u => ({
    userId: u.id,
    name: u.name,
    githubUsername: u.githubUsername,
    commits: tasks.filter(t => t.assigneeId === u.id && t.status === "completed").length,
    date: new Date().toISOString().split("T")[0],
  }));
  res.json(result);
});

router.get("/:projectId/summary", async (req: AuthedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId as string);
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const completed = tasks.filter(t => t.status === "completed");
  const overdue = tasks.filter(t => t.status === "overdue");
  const onTime = completed.filter(t => {
    if (!t.dueDate || !t.completedAt) return true;
    return new Date(t.completedAt) <= new Date(t.dueDate);
  });
  const pct = completed.length > 0 ? (onTime.length / completed.length) * 100 : 100;

  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId))];
  const users = assigneeIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl })
        .from(usersTable).where(inArray(usersTable.id, assigneeIds))
    : [];

  const totalWorkload = tasks.reduce((sum, t) => sum + t.workloadPct, 0);
  const memberBreakdown = users.map(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.id);
    const userWorkload = userTasks.reduce((sum, t) => sum + t.workloadPct, 0);
    return {
      userId: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      taskCount: userTasks.length,
      workloadPct: totalWorkload > 0 ? Math.round((userWorkload / totalWorkload) * 100) : 0,
    };
  });

  res.json({
    projectId,
    totalTasks: tasks.length,
    completedTasks: completed.length,
    overdueTasks: overdue.length,
    onTimePct: Math.round(pct),
    memberBreakdown,
  });
});

export default router;
