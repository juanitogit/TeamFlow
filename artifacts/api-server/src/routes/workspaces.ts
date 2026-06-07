// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  githubRepoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

// Create a new workspace
router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const parse = createWorkspaceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { name, description, githubRepoUrl } = parse.data;

  try {
    const [workspace] = await db.insert(workspacesTable).values({
      name,
      description,
      githubRepoUrl: githubRepoUrl || null,
      createdBy: userId,
    }).returning();

    // The creator becomes the "leader"
    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      userId,
      role: "leader",
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

// Get user's workspaces
router.get("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const memberships = await db.select({
      workspaceId: workspaceMembersTable.workspaceId,
      role: workspaceMembersTable.role,
      joinedAt: workspaceMembersTable.joinedAt,
      workspace: workspacesTable,
    })
    .from(workspaceMembersTable)
    .innerJoin(workspacesTable, eq(workspaceMembersTable.workspaceId, workspacesTable.id))
    .where(eq(workspaceMembersTable.userId, userId));

    res.json(memberships);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch workspaces" });
  }
});

// Join a workspace (simplified: by ID for now, later could be by invite link)
router.post("/:id/join", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  if (isNaN(workspaceId)) {
    res.status(400).json({ error: "Invalid workspace ID" });
    return;
  }

  try {
    const [existing] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (existing) {
      res.status(400).json({ error: "Already a member of this workspace" });
      return;
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    await db.insert(workspaceMembersTable).values({
      workspaceId,
      userId,
      role: "member",
    });

    res.json({ success: true, message: "Joined workspace" });
  } catch (error) {
    res.status(500).json({ error: "Failed to join workspace" });
  }
});

export default router;
