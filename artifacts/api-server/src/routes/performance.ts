import { Router, Response } from "express";
import { db, usersTable, tasksTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/team", async (req: AuthedRequest, res: Response) => {
  const users = await db.select().from(usersTable);
  const result = await Promise.all(users.map(async (user) => {
    const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, user.id));
    const completed = allTasks.filter(t => t.status === "completed");
    const onTime = completed.filter(t => {
      if (!t.dueDate || !t.completedAt) return true;
      return new Date(t.completedAt) <= new Date(t.dueDate);
    });
    const late = completed.length - onTime.length;
    const pending = allTasks.filter(t => t.status === "pending" || t.status === "in_progress");
    const totalWorkload = allTasks.reduce((sum, t) => sum + t.workloadPct, 0);
    return {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      performanceScore: user.performanceScore,
      healthPoints: user.healthPoints,
      tasksCompleted: completed.length,
      tasksOnTime: onTime.length,
      tasksLate: late,
      tasksPending: pending.length,
      workloadPercentage: Math.round(totalWorkload),
    };
  }));
  res.json(result);
});

router.get("/dashboard", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const myTasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
  const activeTasks = myTasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const overdueTasks = myTasks.filter(t => t.status === "overdue");
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const completedThisWeek = myTasks.filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= oneWeekAgo);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const upcomingDeadlines = myTasks
    .filter(t => t.dueDate && t.status !== "completed" && t.status !== "overdue" && new Date(t.dueDate) <= tomorrow)
    .slice(0, 5);

  const allUsers = await db.select({ healthPoints: usersTable.healthPoints }).from(usersTable);
  const teamHealthAvg = allUsers.length > 0
    ? allUsers.reduce((s, u) => s + u.healthPoints, 0) / allUsers.length
    : 100;

  const recentActivity = await db.select({
    id: activityLogTable.id,
    userId: activityLogTable.userId,
    action: activityLogTable.action,
    entityType: activityLogTable.entityType,
    entityTitle: activityLogTable.entityTitle,
    createdAt: activityLogTable.createdAt,
  }).from(activityLogTable).orderBy(activityLogTable.createdAt).limit(10);

  const enrichedActivity = await Promise.all(recentActivity.map(async (a) => {
    const [u] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, a.userId));
    return { ...a, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl ?? null };
  }));

  res.json({
    healthPoints: user.healthPoints,
    performanceScore: user.performanceScore,
    activeTasksCount: activeTasks.length,
    overdueTasksCount: overdueTasks.length,
    completedThisWeek: completedThisWeek.length,
    teamHealthAvg: Math.round(teamHealthAvg),
    upcomingDeadlines,
    recentActivity: enrichedActivity,
  });
});

export default router;
