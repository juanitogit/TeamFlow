// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, tasksTable, projectsTable, usersTable, healthEventsTable, activityLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    if (event !== "push" && event !== "create") {
      res.json({ ok: true, message: "Event ignored" });
      return;
    }

    const repoFullName = payload?.repository?.full_name as string | undefined;
    if (!repoFullName) {
      res.json({ ok: true, message: "No repository info" });
      return;
    }

    const commits: Array<{ id: string; message: string; author: { username?: string; name: string } }> =
      payload?.commits ?? [];

    const [project] = await db.select().from(projectsTable)
      .where(eq(projectsTable.githubRepoName, repoFullName));

    if (!project) {
      res.json({ ok: true, message: "Project not found for this repo" });
      return;
    }

    for (const commit of commits) {
      const sha = commit.id;
      const message = commit.message ?? "";
      const githubUsername = commit.author?.username;

      let assigneeId: number | undefined;
      if (githubUsername) {
        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable).where(eq(usersTable.githubUsername, githubUsername));
        assigneeId = user?.id;
      }

      const pendingProgrammingTasks = await db.select().from(tasksTable)
        .where(and(
          eq(tasksTable.projectId, project.id),
          eq(tasksTable.type, "programming"),
          ...(assigneeId ? [eq(tasksTable.assigneeId, assigneeId)] : []),
        ));

      for (const task of pendingProgrammingTasks) {
        if (task.status === "completed") continue;
        const titleWords = task.title.toLowerCase().split(/\s+/);
        const msgLower = message.toLowerCase();
        const mentionsTask = titleWords.some(w => w.length > 3 && msgLower.includes(w)) ||
          msgLower.includes(`#${task.id}`) ||
          msgLower.includes(`fix`) ||
          msgLower.includes(`closes`) ||
          msgLower.includes(`resolve`);

        if (!mentionsTask && pendingProgrammingTasks.length > 1) continue;

        const now = new Date();
        const isOnTime = !task.dueDate || now <= new Date(task.dueDate);
        await db.update(tasksTable).set({
          status: "completed",
          completedAt: now,
          githubCommitSha: sha,
        }).where(eq(tasksTable.id, task.id));

        const healthDelta = isOnTime ? 5 : -5;
        await db.insert(healthEventsTable).values({
          userId: task.assigneeId,
          eventType: isOnTime ? "completed_on_time" : "completed_late",
          delta: healthDelta,
          description: `Auto-completed "${task.title}" via GitHub commit ${sha.slice(0, 7)}`,
        });

        const [user] = await db.select({ healthPoints: usersTable.healthPoints, name: usersTable.name, email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, task.assigneeId));
        if (user) {
          const newHp = Math.max(0, Math.min(100, user.healthPoints + healthDelta));
          await db.update(usersTable).set({
            healthPoints: newHp,
          }).where(eq(usersTable.id, task.assigneeId));

          if (isOnTime && user.email) {
            import("../lib/email").then(({ sendEmail }) => {
              sendEmail(
                user.email!,
                "¡Magia de GitHub! Tarea entregada a tiempo 🚀",
                `<h2>¡Felicidades ${user.name}!</h2>
                <p>Detectamos tu commit <code>${sha.slice(0, 7)}</code> y hemos completado tu tarea <strong>${task.title}</strong> automáticamente.</p>
                <p>¡Has ganado +5 puntos de salud!</p>
                <p>Tu salud actual es: <strong>${newHp}</strong></p>`
              );
            });
          }
        }

        await db.insert(activityLogTable).values({
          userId: task.assigneeId,
          action: "auto-completed task via commit",
          entityType: "task",
          entityId: task.id,
          entityTitle: task.title,
        });

        logger.info({ taskId: task.id, sha }, "Task auto-completed via GitHub commit");
        break;
      }
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "GitHub webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
