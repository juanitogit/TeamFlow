// @ts-nocheck
import { Router, Response } from "express";
import { db, usersTable, tasksTable, healthEventsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res: Response) => {
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    healthPoints: usersTable.healthPoints,
    performanceScore: usersTable.performanceScore,
    avatarUrl: usersTable.avatarUrl,
    githubUsername: usersTable.githubUsername,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users);
});

router.get("/:userId", async (req: AuthedRequest, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    healthPoints: usersTable.healthPoints,
    performanceScore: usersTable.performanceScore,
    avatarUrl: usersTable.avatarUrl,
    githubUsername: usersTable.githubUsername,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.get("/:userId/performance/:period", async (req: AuthedRequest, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
  const completed = allTasks.filter(t => t.status === "completed");
  const onTime = completed.filter(t => {
    if (!t.dueDate || !t.completedAt) return true;
    return new Date(t.completedAt) <= new Date(t.dueDate);
  });
  const late = completed.length - onTime.length;
  const pending = allTasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const totalTasks = allTasks.filter(t => t.status !== "pending");
  const pct = totalTasks.length > 0 ? (onTime.length / totalTasks.length) * 100 : 100;
  const totalWorkload = allTasks.reduce((sum, t) => sum + t.workloadPct, 0);

  res.json({
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    performanceScore: Math.round(pct),
    healthPoints: user.healthPoints,
    tasksCompleted: completed.length,
    tasksOnTime: onTime.length,
    tasksLate: late,
    tasksPending: pending.length,
    workloadPercentage: Math.round(totalWorkload),
  });
});

router.get("/:userId/health-history", async (req: AuthedRequest, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  const events = await db.select().from(healthEventsTable)
    .where(eq(healthEventsTable.userId, userId))
    .orderBy(healthEventsTable.createdAt);
  res.json(events);
});

export default router;
