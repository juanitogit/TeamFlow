import { Router, Response } from "express";
import { db, sprintsTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

// Get sprints for a workspace
router.get("/workspace/:workspaceId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.workspaceId);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "No eres miembro de este workspace" });
      return;
    }

    const sprints = await db.select().from(sprintsTable)
      .where(eq(sprintsTable.workspaceId, workspaceId))
      .orderBy(desc(sprintsTable.createdAt));

    res.json(sprints);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sprints" });
  }
});

// Create a new sprint
router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  
  const parse = z.object({
    workspaceId: z.number(),
    name: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { workspaceId, name, startDate, endDate } = parse.data;

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden crear sprints" });
      return;
    }

    const [sprint] = await db.insert(sprintsTable).values({
      workspaceId,
      name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: "planificacion",
    }).returning();

    res.status(201).json(sprint);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el sprint" });
  }
});

// Update a sprint
router.put("/:id", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const sprintId = parseInt(req.params.id);
  
  const parse = z.object({
    name: z.string().min(1),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  }).safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  try {
    const [sprint] = await db.select().from(sprintsTable).where(eq(sprintsTable.id, sprintId));
    if (!sprint) {
      res.status(404).json({ error: "Sprint no encontrado" });
      return;
    }

    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, sprint.workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden editar sprints" });
      return;
    }

    const { name, startDate, endDate } = parse.data;

    const [updated] = await db.update(sprintsTable).set({
      name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    }).where(eq(sprintsTable.id, sprintId)).returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el sprint" });
  }
});

export default router;
