import { Router, Response } from "express";
import { db, manualLogsTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.get("/workspace/:workspaceId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.workspaceId);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) return res.status(403).json({ error: "No eres miembro" });

    // If leader, see all logs; if member, only own logs
    let condition = eq(manualLogsTable.workspaceId, workspaceId);
    if (membership.role !== "leader" && membership.role !== "co-leader") {
      condition = and(condition, eq(manualLogsTable.userId, userId)) as any;
    }

    const logs = await db.select({
      id: manualLogsTable.id,
      date: manualLogsTable.date,
      description: manualLogsTable.description,
      hours: manualLogsTable.hours,
      type: manualLogsTable.type,
      user: {
        id: usersTable.id,
        name: usersTable.name,
      }
    })
      .from(manualLogsTable)
      .innerJoin(usersTable, eq(manualLogsTable.userId, usersTable.id))
      .where(condition)
      .orderBy(desc(manualLogsTable.date));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  
  const parse = z.object({
    workspaceId: z.number(),
    description: z.string().min(1),
    hours: z.number().min(0.1).max(24),
    date: z.string(),
    type: z.enum(["reunion", "documentacion", "revision", "soporte", "otro"]),
  }).safeParse(req.body);

  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

  const { workspaceId, description, hours, date, type } = parse.data;

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) return res.status(403).json({ error: "No eres miembro" });

    const [log] = await db.insert(manualLogsTable).values({
      workspaceId,
      userId,
      description,
      hours: hours.toString(),
      date: new Date(date),
      type,
    }).returning();

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: "Error al registrar" });
  }
});

export default router;
