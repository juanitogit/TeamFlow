// @ts-nocheck
import { Router, Response } from "express";
import { db, roadmapItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { CreateRoadmapItemBody, UpdateRoadmapItemBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res: Response) => {
  const { month, year } = req.query;
  const conditions: any[] = [];
  if (month) conditions.push(eq(roadmapItemsTable.month, parseInt(month as string)));
  if (year) conditions.push(eq(roadmapItemsTable.year, parseInt(year as string)));
  const items = conditions.length > 0
    ? await db.select().from(roadmapItemsTable).where(and(...conditions))
    : await db.select().from(roadmapItemsTable);
  res.json(items);
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  if (req.userRole !== "leader") {
    res.status(403).json({ error: "Only team leaders can create roadmap items" });
    return;
  }
  const parse = CreateRoadmapItemBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, description, month, year, status, assignedUserIds } = parse.data;
  const [item] = await db.insert(roadmapItemsTable).values({
    title,
    description,
    month,
    year,
    status: (status as "planned" | "in_progress" | "achieved" | "missed") ?? "planned",
    assignedUserIds: assignedUserIds ?? [],
  }).returning();
  res.status(201).json(item);
});

router.patch("/:itemId", async (req: AuthedRequest, res: Response) => {
  const itemId = parseInt(req.params.itemId as string);
  const parse = UpdateRoadmapItemBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parse.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.status !== undefined) updates.status = d.status;
  if (d.assignedUserIds !== undefined) updates.assignedUserIds = d.assignedUserIds;
  const [item] = await db.update(roadmapItemsTable).set(updates).where(eq(roadmapItemsTable.id, itemId)).returning();
  if (!item) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }
  res.json(item);
});

router.delete("/:itemId", async (req: AuthedRequest, res: Response) => {
  const itemId = parseInt(req.params.itemId as string);
  await db.delete(roadmapItemsTable).where(eq(roadmapItemsTable.id, itemId));
  res.status(204).send();
});

export default router;
