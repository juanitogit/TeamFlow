// @ts-nocheck
import { Router, Response } from "express";
import { db, workspaceTasksTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";

import { sendEmail, taskAssignedEmail, taskCompletedEmail } from "../services/email";

const router = Router();
router.use(requireAuth);

// Leader assigns a task to a member
router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const parse = z.object({
    workspaceId: z.number(),
    assignedTo: z.number(),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["programacion", "documentacion", "investigacion"]),
    dueDate: z.string().optional(),
    sprintId: z.number().optional(),
  }).safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { workspaceId, assignedTo, title, description, type, dueDate, sprintId } = parse.data;

  try {
    // Check assigner is leader/co-leader
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes y co-líderes pueden asignar tareas" });
      return;
    }

    // Check assignee is a member
    const [targetMember] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, assignedTo)));

    if (!targetMember) {
      res.status(400).json({ error: "El usuario no pertenece a este workspace" });
      return;
    }

    const [task] = await db.insert(workspaceTasksTable).values({
      workspaceId,
      assignedTo,
      assignedBy: userId,
      title,
      description,
      type,
      status: "pendiente",
      dueDate: dueDate ? new Date(dueDate) : null,
      sprintId: sprintId || null,
    }).returning();

    // Notify user via email
    const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, assignedTo));
    if (userRecord && userRecord.email) {
      const emailData = taskAssignedEmail(userRecord.name, title, type, dueDate);
      await sendEmail(userRecord.email, emailData.subject, `Nueva tarea: ${title}`, emailData.html);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la tarea" });
  }
});

// Get tasks for a workspace
router.get("/workspace/:workspaceId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.workspaceId);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "No eres miembro" });
      return;
    }

    const tasks = await db.select({
      id: workspaceTasksTable.id,
      title: workspaceTasksTable.title,
      description: workspaceTasksTable.description,
      type: workspaceTasksTable.type,
      status: workspaceTasksTable.status,
      commitSha: workspaceTasksTable.commitSha,
      dueDate: workspaceTasksTable.dueDate,
      sprintId: workspaceTasksTable.sprintId,
      completedAt: workspaceTasksTable.completedAt,
      createdAt: workspaceTasksTable.createdAt,
      assignedTo: {
        id: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
      },
    })
    .from(workspaceTasksTable)
    .innerJoin(usersTable, eq(workspaceTasksTable.assignedTo, usersTable.id))
    .where(eq(workspaceTasksTable.workspaceId, workspaceId))
    .orderBy(desc(workspaceTasksTable.createdAt));

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tareas" });
  }
});

// Update task status
router.patch("/:id/status", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const taskId = parseInt(req.params.id);
  const { status, commitSha } = req.body;

  if (!["pendiente", "en_progreso", "en_revision", "completada", "vencida"].includes(status)) {
    res.status(400).json({ error: "Estado inválido" });
    return;
  }

  try {
    const [task] = await db.select().from(workspaceTasksTable).where(eq(workspaceTasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Tarea no encontrada" }); return; }
    if (task.assignedTo !== userId) { res.status(403).json({ error: "Solo el asignado puede completar" }); return; }
    if (task.type === "programacion" && !commitSha && status === "completada") {
      res.status(400).json({ error: "Las tareas de programación requieren un Commit SHA" });
      return;
    }

    const [updated] = await db.update(workspaceTasksTable).set({
      status: status,
      commitSha: commitSha || task.commitSha,
      completedAt: status === "completada" ? new Date() : null,
    }).where(eq(workspaceTasksTable.id, taskId)).returning();

    if (status === "completada") {
      // Add performance points
      await db.update(usersTable).set({
        performanceScore: (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0].performanceScore + 5,
      }).where(eq(usersTable.id, userId));

      // Notify the leader who assigned this task
      const [assignee] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      const [assigner] = await db.select().from(usersTable).where(eq(usersTable.id, task.assignedBy));
      if (assigner && assigner.email) {
        const emailData = taskCompletedEmail(assigner.name, assignee?.name || 'Un miembro', task.title, commitSha);
        await sendEmail(assigner.email, emailData.subject, `${assignee?.name} completó la tarea ${task.title}`, emailData.html);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado de tarea" });
  }
});

// Complete a task (the assignee)
router.post("/:id/complete", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const taskId = parseInt(req.params.id);
  const { commitSha } = req.body;

  try {
    const [task] = await db.select().from(workspaceTasksTable).where(eq(workspaceTasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Tarea no encontrada" }); return; }
    if (task.assignedTo !== userId) { res.status(403).json({ error: "Solo el asignado puede completar" }); return; }
    if (task.type === "programacion" && !commitSha) {
      res.status(400).json({ error: "Las tareas de programación requieren un Commit SHA" });
      return;
    }

    const [updated] = await db.update(workspaceTasksTable).set({
      status: "completada",
      commitSha: commitSha || null,
      completedAt: new Date(),
    }).where(eq(workspaceTasksTable.id, taskId)).returning();

    // Add performance points
    await db.update(usersTable).set({
      performanceScore: (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0].performanceScore + 5,
    }).where(eq(usersTable.id, userId));

    // Notify the leader who assigned this task
    const [assignee] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const [assigner] = await db.select().from(usersTable).where(eq(usersTable.id, task.assignedBy));
    if (assigner && assigner.email) {
      const emailData = taskCompletedEmail(assigner.name, assignee?.name || 'Un miembro', task.title, commitSha);
      await sendEmail(assigner.email, emailData.subject, `${assignee?.name} completó la tarea ${task.title}`, emailData.html);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al completar tarea" });
  }
});

export default router;
