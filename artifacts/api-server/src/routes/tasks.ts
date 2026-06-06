import { Router, Response } from "express";
import { db, tasksTable, usersTable, projectsTable, healthEventsTable, activityLogTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

async function enrichTask(task: typeof tasksTable.$inferSelect) {
  const [assignee] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl })
    .from(usersTable).where(eq(usersTable.id, task.assigneeId));
  const [project] = await db.select({ name: projectsTable.name })
    .from(projectsTable).where(eq(projectsTable.id, task.projectId));
  return {
    ...task,
    assigneeName: assignee?.name ?? null,
    assigneeAvatar: assignee?.avatarUrl ?? null,
    projectName: project?.name ?? null,
  };
}

async function recalcPerformance(userId: number) {
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
  const completed = tasks.filter(t => t.status === "completed");
  const meaningful = tasks.filter(t => t.status !== "pending");
  if (meaningful.length === 0) return;
  const onTime = completed.filter(t => {
    if (!t.dueDate || !t.completedAt) return true;
    return new Date(t.completedAt) <= new Date(t.dueDate);
  });
  const score = (onTime.length / meaningful.length) * 100;
  await db.update(usersTable).set({ performanceScore: Math.round(score) }).where(eq(usersTable.id, userId));
}

router.get("/", async (req: AuthedRequest, res: Response) => {
  const { projectId, assigneeId, status } = req.query;
  let query = db.select().from(tasksTable);
  const conditions = [];
  if (projectId) conditions.push(eq(tasksTable.projectId, parseInt(projectId as string)));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, parseInt(assigneeId as string)));
  if (status) conditions.push(eq(tasksTable.status, status as "pending" | "in_progress" | "completed" | "overdue"));
  const tasks = conditions.length > 0
    ? await db.select().from(tasksTable).where(and(...conditions))
    : await db.select().from(tasksTable);
  const enriched = await Promise.all(tasks.map(enrichTask));
  res.json(enriched);
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  if (req.userRole !== "leader") {
    res.status(403).json({ error: "Only team leaders can create tasks" });
    return;
  }
  const parse = CreateTaskBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, description, type, projectId, assigneeId, workloadPct, dueDate } = parse.data;
  const [task] = await db.insert(tasksTable).values({
    title,
    description,
    type: type as "programming" | "documentation" | "research",
    status: "pending",
    projectId,
    assigneeId,
    workloadPct,
    dueDate: dueDate ?? null,
  }).returning();

  await db.insert(activityLogTable).values({
    userId: req.userId!,
    action: "created task",
    entityType: "task",
    entityId: task.id,
    entityTitle: task.title,
  });

  const enriched = await enrichTask(task);
  res.status(201).json(enriched);
});

router.get("/:taskId", async (req: AuthedRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(await enrichTask(task));
});

router.patch("/:taskId", async (req: AuthedRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  const parse = UpdateTaskBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parse.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.type !== undefined) updates.type = d.type;
  if (d.status !== undefined) updates.status = d.status;
  if (d.workloadPct !== undefined) updates.workloadPct = d.workloadPct;
  if (d.dueDate !== undefined) updates.dueDate = d.dueDate;
  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, taskId)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(await enrichTask(task));
});

router.delete("/:taskId", async (req: AuthedRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
  res.status(204).send();
});

router.post("/:taskId/complete", async (req: AuthedRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const now = new Date();
  const isOnTime = !existing.dueDate || now <= new Date(existing.dueDate);
  const [task] = await db.update(tasksTable).set({
    status: "completed",
    completedAt: now,
  }).where(eq(tasksTable.id, taskId)).returning();

  const healthDelta = isOnTime ? 5 : -10;
  const eventType = isOnTime ? "completed_on_time" : "completed_late";
  const description = isOnTime
    ? `Completed "${task.title}" on time — +5 health`
    : `Completed "${task.title}" late — -10 health`;

  await db.insert(healthEventsTable).values({
    userId: task.assigneeId,
    eventType,
    delta: healthDelta,
    description,
  });

  const [user] = await db.select({ healthPoints: usersTable.healthPoints })
    .from(usersTable).where(eq(usersTable.id, task.assigneeId));
  if (user) {
    const newHp = Math.max(0, Math.min(100, user.healthPoints + healthDelta));
    await db.update(usersTable).set({ healthPoints: newHp }).where(eq(usersTable.id, task.assigneeId));
  }

  await recalcPerformance(task.assigneeId);

  await db.insert(activityLogTable).values({
    userId: req.userId!,
    action: "completed task",
    entityType: "task",
    entityId: task.id,
    entityTitle: task.title,
  });

  res.json(await enrichTask(task));
});

export default router;
