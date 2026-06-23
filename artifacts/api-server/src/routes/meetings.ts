import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable, meetingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";
import { sendEmail, meetingInviteEmail } from "../services/email";

const router = Router();
router.use(requireAuth);

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meetLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

// GET /workspaces/:workspaceId/meetings
router.get("/workspaces/:workspaceId", async (req: AuthedRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    
    // Validate membership
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, req.userId!)));
      
    if (!membership) {
      res.status(403).json({ error: "No eres miembro de este workspace" });
      return;
    }

    const meetings = await db.select({
      id: meetingsTable.id,
      title: meetingsTable.title,
      description: meetingsTable.description,
      meetLink: meetingsTable.meetLink,
      startTime: meetingsTable.startTime,
      endTime: meetingsTable.endTime,
      createdAt: meetingsTable.createdAt,
      organizer: {
        id: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
      }
    })
    .from(meetingsTable)
    .innerJoin(usersTable, eq(meetingsTable.organizerId, usersTable.id))
    .where(eq(meetingsTable.workspaceId, workspaceId))
    .orderBy(desc(meetingsTable.startTime));

    res.json(meetings);
  } catch (error) {
    console.error("[Meetings] Error fetching:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspaces/:workspaceId/meetings
router.post("/workspaces/:workspaceId", async (req: AuthedRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.userId!;
    
    // Validate membership and role
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));
      
    if (!membership) {
      res.status(403).json({ error: "No eres miembro de este workspace" });
      return;
    }

    if (membership.role !== "leader" && membership.role !== "co-leader") {
      res.status(403).json({ error: "Solo los líderes pueden agendar reuniones" });
      return;
    }

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));

    const parse = meetingSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    const { title, description, meetLink, startTime, endTime } = parse.data;

    const [newMeeting] = await db.insert(meetingsTable)
      .values({
        workspaceId,
        organizerId: userId,
        title,
        description: description || "",
        meetLink: meetLink || "",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      })
      .returning();

    // Fetch all members to send invites
    const members = await db.select({
      email: usersTable.email,
    })
    .from(workspaceMembersTable)
    .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    // Send emails (fire and forget)
    const emailData = meetingInviteEmail(
      workspace.name, 
      title, 
      description || "", 
      meetLink || "", 
      new Date(startTime), 
      new Date(endTime)
    );

    for (const member of members) {
      if (member.email) {
        sendEmail(member.email, emailData.subject, emailData.subject, emailData.html, emailData.attachments)
          .catch(err => console.error("Failed to send meeting invite to", member.email, err));
      }
    }

    res.json(newMeeting);
  } catch (error) {
    console.error("[Meetings] Error creating:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req: AuthedRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const userId = req.userId!;

    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, meeting.workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader" && meeting.organizerId !== userId)) {
      res.status(403).json({ error: "Not authorized to delete this meeting" });
      return;
    }

    await db.delete(meetingsTable).where(eq(meetingsTable.id, meetingId));
    res.json({ success: true });
  } catch (error) {
    console.error("[Meetings] Error deleting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
