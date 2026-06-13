import { Router, Response } from "express";
import { db, suggestionsTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/workspace/:workspaceId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.workspaceId);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      return res.status(403).json({ error: "Solo líderes pueden ver las sugerencias" });
    }

    const suggestions = await db.select().from(suggestionsTable)
      .where(eq(suggestionsTable.workspaceId, workspaceId))
      .orderBy(desc(suggestionsTable.createdAt));

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sugerencias" });
  }
});

router.patch("/:id/status", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const id = parseInt(req.params.id);
  const { status } = req.body;

  try {
    const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, id));
    if (!suggestion) return res.status(404).json({ error: "Sugerencia no encontrada" });

    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, suggestion.workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      return res.status(403).json({ error: "Solo líderes" });
    }

    const [updated] = await db.update(suggestionsTable)
      .set({ status })
      .where(eq(suggestionsTable.id, id))
      .returning();

    res.json({ success: true, suggestion: updated });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar sugerencia" });
  }
});

// A test endpoint to simulate a github PR merge suggestion
router.post("/simulate", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const { workspaceId, prTitle } = req.body;
  try {
    const [inserted] = await db.insert(suggestionsTable).values({
      workspaceId,
      type: "pr_merged",
      title: "Posible Tarea Completada",
      description: `Detectamos que el PR "${prTitle}" fue mergeado — ¿marcar la tarea asociada como completada?`,
      data: { prTitle }
    }).returning();
    res.json(inserted);
  } catch(e) {
    res.status(500).json({ error: "Error" });
  }
});

export default router;
