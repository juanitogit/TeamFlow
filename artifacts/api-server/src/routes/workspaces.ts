// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";
import crypto from "crypto";
import ExcelJS from "exceljs";
import { sendEmail, joinedWorkspaceEmail, memberRemovedEmail, roleChangedEmail, githubInviteEmail } from "../services/email";
import { fetchGithubCommits } from "./github-stats";
import path from "path";
import fs from "fs";
import { logoBase64 } from "./logoBase64";

const router = Router();
router.use(requireAuth);

function generateInviteCode(expiresInHours: number = 24) {
  return {
    code: crypto.randomBytes(4).toString("hex").toUpperCase(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
  };
}

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
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

  const { name, description, imageUrl, githubRepos } = parse.data;
  
  // Generate invite code with 24-hour expiry by default
  const invite = generateInviteCode(24);

  try {
    const [workspace] = await db.insert(workspacesTable).values({
      name,
      description,
      imageUrl: imageUrl || null,
      githubRepos: JSON.stringify(githubRepos || []),
      inviteCode: invite.code,
      inviteCodeExpiresAt: invite.expiresAt,
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
      res.status(404).json({ error: "Código de invitación inválido o no encontrado" });
      return;
    }

    // Check if invite code has expired
    if (workspace.inviteCodeExpiresAt && new Date(workspace.inviteCodeExpiresAt) < new Date()) {
      res.status(410).json({ error: "El código de invitación ha expirado. Solicita uno nuevo al líder del equipo." });
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

// Invite user via GitHub username
router.post("/:id/invite-github", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);
  const { githubUsername } = req.body;

  if (!githubUsername) {
    res.status(400).json({ error: "El usuario de GitHub es requerido" });
    return;
  }

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden enviar invitaciones directas" });
      return;
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
    if (!workspace) {
      res.status(404).json({ error: "Workspace no encontrado" });
      return;
    }

    // Find user by github username
    const [targetUser] = await db.select().from(usersTable)
      .where(eq(usersTable.githubUsername, githubUsername.toLowerCase()));

    let targetEmail = targetUser?.email;
    let targetName = targetUser?.name || githubUsername;

    // If user is not in DB, try to fetch their public email from GitHub
    if (!targetUser) {
      try {
        const ghRes = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (!ghRes.ok) {
          res.status(404).json({ error: "El usuario de GitHub no existe" });
          return;
        }
        const ghData = await ghRes.json();
        
        if (!ghData.email) {
          res.status(400).json({ error: "El usuario no está registrado en TeamFlow y su email de GitHub es privado. No es posible enviarle una invitación." });
          return;
        }
        
        targetEmail = ghData.email;
        targetName = ghData.name || githubUsername;
      } catch (err) {
        res.status(500).json({ error: "Error de red al consultar GitHub API" });
        return;
      }
    }

    if (!targetEmail) {
      res.status(400).json({ error: "El usuario no tiene un email configurado ni público" });
      return;
    }

    // Generate signed token. We use githubUsername for verification instead of ID
    // since the user might not be registered yet.
    const exp = Date.now() + 24 * 60 * 60 * 1000; // 1 day
    const payload = { workspaceId, githubUsername: githubUsername.toLowerCase(), exp };
    const data = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = crypto.createHmac("sha256", process.env.SESSION_SECRET || "default_secret").update(data).digest("hex");
    const token = `${data}.${signature}`;

    const appUrl = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173"));
    const inviteUrl = `${appUrl}/workspaces?accept_github_invite=${token}`;

    const emailData = githubInviteEmail(targetName, workspace.name, inviteUrl);
    await sendEmail(targetEmail, emailData.subject, "Invitación", emailData.html);
    res.json({ success: true, message: "Invitación enviada por correo exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar invitación" });
  }
});

// Accept GitHub invite token
router.post("/accept-github-invite", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }

  try {
    const [dataStr, signature] = token.split(".");
    if (!dataStr || !signature) {
      res.status(400).json({ error: "Token malformado" });
      return;
    }

    const expectedSignature = crypto.createHmac("sha256", process.env.SESSION_SECRET || "default_secret").update(dataStr).digest("hex");
    if (signature !== expectedSignature) {
      res.status(400).json({ error: "Firma de token inválida" });
      return;
    }

    const payload = JSON.parse(Buffer.from(dataStr, "base64").toString("utf-8"));
    if (Date.now() > payload.exp) {
      res.status(410).json({ error: "La invitación ha expirado" });
      return;
    }

    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    
    if (!currentUser.githubUsername || currentUser.githubUsername.toLowerCase() !== payload.githubUsername) {
      res.status(403).json({ error: `Esta invitación es para el usuario de GitHub '${payload.githubUsername}'. Asegúrate de tener este usuario vinculado a tu perfil.` });
      return;
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, payload.workspaceId));
    if (!workspace) {
      res.status(404).json({ error: "Workspace no encontrado" });
      return;
    }

    const [existing] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspace.id), eq(workspaceMembersTable.userId, userId)));

    if (existing) {
      res.json({ success: true, message: "Ya eras miembro", workspace });
      return;
    }

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      userId,
      role: "member",
    });

    const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (userRecord && userRecord.email) {
      const emailData = joinedWorkspaceEmail(userRecord.name, workspace.name);
      await sendEmail(userRecord.email, emailData.subject, `Te uniste al workspace ${workspace.name}`, emailData.html);
    }

    res.json({ success: true, message: "Joined workspace", workspace });
  } catch (error) {
    console.error("Error accepting invite:", error);
    res.status(500).json({ error: "Error al aceptar la invitación" });
  }
});

// Get current invite code + expiry for a workspace
router.get("/:id/invite", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden ver el código de invitación" });
      return;
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
    if (!workspace) { res.status(404).json({ error: "Workspace no encontrado" }); return; }

    const isExpired = workspace.inviteCodeExpiresAt && new Date(workspace.inviteCodeExpiresAt) < new Date();

    res.json({
      inviteCode: workspace.inviteCode,
      expiresAt: workspace.inviteCodeExpiresAt,
      isExpired: !!isExpired,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener código" });
  }
});

// Regenerate invite code (leader/co-leader only)
router.post("/:id/invite/regenerate", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden regenerar el código" });
      return;
    }

    const expiresInHours = typeof req.body.expiresInHours === 'number' ? req.body.expiresInHours : 24;
    const invite = generateInviteCode(expiresInHours);
    const [updated] = await db.update(workspacesTable)
      .set({ inviteCode: invite.code, inviteCodeExpiresAt: invite.expiresAt })
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    res.json({
      inviteCode: updated.inviteCode,
      expiresAt: updated.inviteCodeExpiresAt,
      isExpired: false,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al regenerar código" });
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

// Update workspace settings
router.patch("/:id", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  const updateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional().or(z.literal("")),
    githubRepos: z.array(z.string()).optional(),
  });

  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  const { name, description, imageUrl, githubRepos } = parseResult.data;

  try {
    const [myMembership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!myMembership || (myMembership.role !== "leader" && myMembership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden editar el workspace" });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;
    if (githubRepos !== undefined) updates.githubRepos = JSON.stringify(githubRepos);

    const [updated] = await db.update(workspacesTable)
      .set(updates)
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    res.json({ success: true, workspace: updated });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar workspace" });
  }
});

// Update member score manually
router.patch("/:id/members/:memberId/score", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);
  const memberId = parseInt(req.params.memberId);
  const { score } = req.body;

  if (typeof score !== 'number' || score < 0 || score > 100) {
    res.status(400).json({ error: "El score debe ser un número entre 0 y 100" });
    return;
  }

  try {
    const [myMembership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!myMembership || (myMembership.role !== "leader" && myMembership.role !== "co-leader")) {
      res.status(403).json({ error: "Solo líderes pueden modificar el score" });
      return;
    }

    await db.update(usersTable)
      .set({ performanceScore: score })
      .where(eq(usersTable.id, memberId));

    res.json({ success: true, message: "Score actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar score" });
  }
});

// Get workspace audit log
router.get("/:id/audit", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      return res.status(403).json({ error: "Solo líderes" });
    }

    // Get all members of the workspace
    const members = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    if (!members.length) return res.json([]);

    const memberIds = members.map(m => m.id);

    // Import activity log table here since it's not imported at the top
    const { activityLogTable } = await import("@workspace/db");
    const { inArray, desc } = await import("drizzle-orm");

    const logs = await db.select({
      id: activityLogTable.id,
      action: activityLogTable.action,
      entityType: activityLogTable.entityType,
      entityTitle: activityLogTable.entityTitle,
      createdAt: activityLogTable.createdAt,
      user: {
        id: usersTable.id,
        name: usersTable.name
      }
    })
      .from(activityLogTable)
      .innerJoin(usersTable, eq(activityLogTable.userId, usersTable.id))
      .where(inArray(activityLogTable.userId, memberIds))
      .orderBy(desc(activityLogTable.createdAt))
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// Download Excel report
router.get("/:id/reports/excel", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.id);

  try {
    const [membership] = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      return res.status(403).json({ error: "Solo líderes" });
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));

    const members = await db.select({
      name: usersTable.name,
      githubUsername: usersTable.githubUsername,
      role: workspaceMembersTable.role,
      performanceScore: usersTable.performanceScore,
      healthPoints: usersTable.healthPoints
    })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    const leaders = members.filter(m => m.role === "leader" || m.role === "co-leader").map(m => m.name).join(", ");
    const avgScore = members.reduce((acc, m) => acc + m.performanceScore, 0) / (members.length || 1);
    const avgHealth = members.reduce((acc, m) => acc + m.healthPoints, 0) / (members.length || 1);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TeamFlow App";
    const sheet = workbook.addWorksheet("Rendimiento del Equipo");

    // Title / Branding
    sheet.mergeCells("A1:D2");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "TeamFlow - Reporte de Rendimiento";
    titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900

    // Workspace info
    sheet.getCell("A4").value = "Workspace:";
    sheet.getCell("A4").font = { bold: true };
    sheet.getCell("B4").value = workspace?.name || `Workspace #${workspaceId}`;

    sheet.getCell("A5").value = "Líder(es):";
    sheet.getCell("A5").font = { bold: true };
    sheet.getCell("B5").value = leaders || "No asignado";

    // Table Headers
    sheet.getRow(7).values = ["Nombre del Miembro", "Rol en el Equipo", "Score de Rendimiento (%)", "Puntos de Salud", "Commits en GitHub"];
    sheet.getRow(7).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(7).alignment = { horizontal: "center", vertical: "middle" };
    
    const headerColors = ["FF2563EB", "FF3B82F6", "FF10B981", "FF14B8A6", "FF6366F1"]; // Blues & Emeralds & Indigo
    sheet.getRow(7).eachCell((cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerColors[colNumber - 1] || "FF2563EB" } };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });

    // Fetch GitHub Commits
    let repos: string[] = [];
    try { repos = JSON.parse(workspace?.githubRepos || "[]"); } catch { repos = []; }
    
    let allCommits: any[] = [];
    for (const r of repos) {
      if (r) {
        const repoCommits = await fetchGithubCommits(r);
        allCommits = allCommits.concat(repoCommits);
      }
    }

    // Role translations
    const roleEs: Record<string, string> = {
      "leader": "Líder",
      "co-leader": "Co-líder",
      "member": "Miembro"
    };

    let totalTeamCommits = 0;
    let topContributorName = "Nadie";
    let topContributorCommits = -1;

    // Table Data
    members.forEach((m, index) => {
      // Find user commits
      let userCommitsCount = 0;
      if (m.githubUsername) {
        userCommitsCount = allCommits.filter(c => c?.author?.login?.toLowerCase() === m.githubUsername?.toLowerCase()).length;
      }
      totalTeamCommits += userCommitsCount;
      if (userCommitsCount > topContributorCommits) {
        topContributorCommits = userCommitsCount;
        topContributorName = m.name;
      }

      const row = sheet.addRow([m.name, roleEs[m.role] || "Miembro", m.performanceScore, m.healthPoints, userCommitsCount]);
      row.alignment = { horizontal: "center", vertical: "middle" };
      row.eachCell((cell) => {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      // Alternate row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; // Slate 50
        });
      }
    });

    // Adjust column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 20;

    // Team Performance Summary
    const summaryRow = sheet.rowCount + 3;
    sheet.mergeCells(`A${summaryRow}:E${summaryRow}`);
    const summaryTitle = sheet.getCell(`A${summaryRow}`);
    summaryTitle.value = "Resumen Global del Equipo";
    summaryTitle.font = { size: 14, bold: true };
    summaryTitle.alignment = { horizontal: "center" };
    summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; // Slate 200

    sheet.getCell(`A${summaryRow + 1}`).value = "Promedio Rendimiento:";
    sheet.getCell(`A${summaryRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`B${summaryRow + 1}`).value = `${avgScore.toFixed(1)}%`;
    sheet.getCell(`B${summaryRow + 1}`).font = { bold: true, color: { argb: "FF2563EB" } };
    sheet.getCell(`B${summaryRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };

    sheet.getCell(`A${summaryRow + 2}`).value = "Promedio Salud:";
    sheet.getCell(`A${summaryRow + 2}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`B${summaryRow + 2}`).value = avgHealth.toFixed(1);
    sheet.getCell(`B${summaryRow + 2}`).font = { bold: true, color: { argb: "FF10B981" } };
    sheet.getCell(`B${summaryRow + 2}`).alignment = { horizontal: "center", vertical: "middle" };

    sheet.getCell(`D${summaryRow + 1}`).value = "Total Commits:";
    sheet.getCell(`D${summaryRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`E${summaryRow + 1}`).value = totalTeamCommits;
    sheet.getCell(`E${summaryRow + 1}`).font = { bold: true, color: { argb: "FF6366F1" } };
    sheet.getCell(`E${summaryRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };

    sheet.getCell(`D${summaryRow + 2}`).value = "Top Contribuyente:";
    sheet.getCell(`D${summaryRow + 2}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`E${summaryRow + 2}`).value = topContributorName;
    sheet.getCell(`E${summaryRow + 2}`).font = { bold: true, color: { argb: "FF6366F1" } };
    sheet.getCell(`E${summaryRow + 2}`).alignment = { horizontal: "center", vertical: "middle" };

    // Try to add TeamFlow logo
    try {
      const logoId = workbook.addImage({
        base64: `data:image/png;base64,${logoBase64}`,
        extension: "png",
      });
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 40, height: 40 },
      });
    } catch (e) {
      console.log("Could not add logo", e);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=TeamFlow_Reporte_${workspaceId}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Generation Error:", error);
    res.status(500).json({ error: "Error generando reporte Excel" });
  }
});

export default router;
