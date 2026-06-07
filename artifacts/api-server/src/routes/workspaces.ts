// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail, joinedWorkspaceEmail, memberRemovedEmail, roleChangedEmail } from "../services/email";

const router = Router();
router.use(requireAuth);

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  githubRepos: z.array(z.string().url("Must be a valid URL")).optional(),
});

// Create a new workspace
router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const parse = createWorkspaceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { name, description, githubRepos } = parse.data;
  
  // Generate a complex 8-character invite code
  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

  try {
    const [workspace] = await db.insert(workspacesTable).values({
      name,
      description,
      githubRepos: JSON.stringify(githubRepos || []),
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

    // Notify user via email
    const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (userRecord && userRecord.email) {
      const emailData = joinedWorkspaceEmail(userRecord.name, workspace.name);
      await sendEmail(userRecord.email, emailData.subject, `Te uniste al workspace ${workspace.name}`, emailData.html);
    }

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

// Remove a member (leader only)
router.delete("/:id/members/:memberId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);
  const memberId = parseInt(req.params.memberId);

  try {
    // Check requester is leader
    const [myMembership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!myMembership || myMembership.role !== "leader") {
      res.status(403).json({ error: "Solo el líder puede eliminar miembros" });
      return;
    }

    if (memberId === userId) {
      res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
      return;
    }

    // Get member info before deleting
    const [removedUser] = await db.select().from(usersTable).where(eq(usersTable.id, memberId));
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));

    await db.delete(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, memberId)));

    // Notify removed member via email
    if (removedUser && removedUser.email) {
      const emailData = memberRemovedEmail(removedUser.name, workspace?.name || 'desconocido');
      await sendEmail(removedUser.email, emailData.subject, `Fuiste removido del workspace ${workspace?.name}`, emailData.html);
    }

    res.json({ success: true, message: "Miembro eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar miembro" });
  }
});

// Change member role (leader only)
router.patch("/:id/members/:memberId/role", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);
  const memberId = parseInt(req.params.memberId);
  const { role } = req.body;

  if (!["leader", "co-leader", "member"].includes(role)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }

  try {
    // Check requester is leader
    const [myMembership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!myMembership || myMembership.role !== "leader") {
      res.status(403).json({ error: "Solo el líder principal puede cambiar roles" });
      return;
    }

    if (memberId === userId && role !== "leader") {
      res.status(400).json({ error: "No puedes degradar tu propio rol. Debes transferir el liderazgo a otro." });
      return;
    }

    await db.update(workspaceMembersTable)
      .set({ role })
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, memberId)));

    // Notify user via email
    const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, memberId));
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
    if (userRecord && userRecord.email) {
      const emailData = roleChangedEmail(userRecord.name, role, ws?.name || 'Workspace');
      await sendEmail(userRecord.email, emailData.subject, `Tu rol cambió a ${role}`, emailData.html);
    }

    res.json({ success: true, message: "Rol actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

// Update workspace settings (e.g. repos, name, description) (leader only)
router.patch("/:id", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);
  const { githubRepos, name, description } = req.body;

  try {
    const [myMembership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!myMembership || (myMembership.role !== "leader" && myMembership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden editar el workspace" });
      return;
    }

    const updates: any = {};
    if (githubRepos !== undefined) updates.githubRepos = JSON.stringify(githubRepos || []);
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db.update(workspacesTable)
      .set(updates)
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    res.json({ success: true, workspace: updated });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar workspace" });
  }
});

export default router;
