// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";
import crypto from "crypto";

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
  
  // Generate a complex 8-character invite code
  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

  try {
    const [workspace] = await db.insert(workspacesTable).values({
      name,
      description,
      githubRepoUrl: githubRepoUrl || null,
      inviteCode,
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

// Join a workspace by invite code
router.post("/join", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const inviteCode = req.body.inviteCode;

  if (!inviteCode || typeof inviteCode !== "string") {
    res.status(400).json({ error: "Invalid invite code" });
    return;
  }

  try {
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.inviteCode, inviteCode));
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found or invalid code" });
      return;
    }

    const [existing] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspace.id), eq(workspaceMembersTable.userId, userId)));

    if (existing) {
      res.status(400).json({ error: "Already a member of this workspace" });
      return;
    }

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      userId,
      role: "member",
    });

    res.json({ success: true, message: "Joined workspace", workspace });
  } catch (error) {
    res.status(500).json({ error: "Failed to join workspace" });
  }
});

// Get workspace members with performance stats
router.get("/:id/members", async (req: AuthedRequest, res: Response) => {
  const workspaceId = parseInt(req.params.id);
  const userId = req.userId!;

  try {
    // Check if requester is a member
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "Not a member" });
      return;
    }

    const members = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      performanceScore: usersTable.performanceScore,
      healthPoints: usersTable.healthPoints,
      role: workspaceMembersTable.role,
      joinedAt: workspaceMembersTable.joinedAt
    })
    .from(workspaceMembersTable)
    .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    // Also get contributions count for each member in this workspace
    const { contributionsTable } = require("@workspace/db");
    const contributions = await db.select()
      .from(contributionsTable)
      .where(eq(contributionsTable.workspaceId, workspaceId));

    const result = members.map(m => {
      const userContribs = contributions.filter((c: any) => c.userId === m.id);
      const approved = userContribs.filter((c: any) => c.status === "approved").length;
      const pending = userContribs.filter((c: any) => c.status === "pending").length;
      const rejected = userContribs.filter((c: any) => c.status === "rejected").length;
      return {
        ...m,
        contributions: { approved, pending, rejected, total: userContribs.length }
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

export default router;
