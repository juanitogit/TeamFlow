// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, contributionsTable, workspaceMembersTable, usersTable, workspacesTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { z } from "zod";
import { sendEmail, contributionSubmittedEmail, contributionReviewedEmail } from "../services/email";

const router = Router();
router.use(requireAuth);

const submitContributionSchema = z.object({
  workspaceId: z.number(),
  commitSha: z.string().min(1, "Commit SHA is required"),
  commitMessage: z.string().min(1, "Commit message is required"),
  repoUrl: z.string().url().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
});

// Submit a new contribution
router.post("/", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const parse = submitContributionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { workspaceId, commitSha, commitMessage, repoUrl, evidenceUrls } = parse.data;

  try {
    // Check if user is a member
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "Not a member of this workspace" });
      return;
    }

    const [contribution] = await db.insert(contributionsTable).values({
      workspaceId,
      userId,
      commitSha,
      commitMessage,
      repoUrl,
      evidenceUrls: evidenceUrls || [],
      status: "pending",
    }).returning();

    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      const [wsInfo] = await db.select({ name: workspacesTable.name }).from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
      
      const leaders = await db.select({ email: usersTable.email })
        .from(workspaceMembersTable)
        .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, workspaceId),
            inArray(workspaceMembersTable.role, ["leader", "co-leader"])
          )
        );
        
      if (user && wsInfo && leaders.length > 0) {
        const emailData = contributionSubmittedEmail(user.name, wsInfo.name, commitMessage);
        for (const leader of leaders) {
          if (leader.email) {
            await sendEmail(leader.email, emailData.subject, emailData.subject, emailData.html);
          }
        }
      }
    } catch (e) {
      console.error("Failed to send contribution email", e);
    }

    res.status(201).json(contribution);
  } catch (error) {
    res.status(500).json({ error: "Failed to submit contribution" });
  }
});

// Get contributions for a workspace
router.get("/workspace/:workspaceId", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const workspaceId = parseInt(req.params.workspaceId);

  try {
    // Check membership
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "Not a member of this workspace" });
      return;
    }

    const contributions = await db.select({
      id: contributionsTable.id,
      commitSha: contributionsTable.commitSha,
      commitMessage: contributionsTable.commitMessage,
      repoUrl: contributionsTable.repoUrl,
      evidenceUrls: contributionsTable.evidenceUrls,
      status: contributionsTable.status,
      reviewComment: contributionsTable.reviewComment,
      createdAt: contributionsTable.createdAt,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
      }
    })
    .from(contributionsTable)
    .innerJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
    .where(eq(contributionsTable.workspaceId, workspaceId))
    .orderBy(desc(contributionsTable.createdAt));

    res.json(contributions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
});

// Review a contribution (leader/co-leader only)
const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewComment: z.string().optional(),
});

router.post("/:id/review", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const contributionId = parseInt(req.params.id);

  const parse = reviewSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  try {
    const [contribution] = await db.select()
      .from(contributionsTable)
      .where(eq(contributionsTable.id, contributionId));

    if (!contribution) {
      res.status(404).json({ error: "Contribution not found" });
      return;
    }

    // Check if reviewer is leader or co-leader
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(
        eq(workspaceMembersTable.workspaceId, contribution.workspaceId), 
        eq(workspaceMembersTable.userId, userId)
      ));

    if (!membership || (membership.role !== "leader" && membership.role !== "co-leader")) {
      res.status(403).json({ error: "Only leaders and co-leaders can review" });
      return;
    }

    const [updated] = await db.update(contributionsTable).set({
      status: parse.data.status,
      reviewComment: parse.data.reviewComment,
      reviewedBy: userId,
      reviewedAt: new Date(),
    }).where(eq(contributionsTable.id, contributionId)).returning();

    // If approved, we could increase performanceScore here
    if (parse.data.status === "approved") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, contribution.userId));
      if (user) {
        await db.update(usersTable)
          .set({ performanceScore: user.performanceScore + 10 }) // Simple +10 points
          .where(eq(usersTable.id, user.id));
      }
    }
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, contribution.userId));
      const [wsInfo] = await db.select({ name: workspacesTable.name }).from(workspacesTable).where(eq(workspacesTable.id, contribution.workspaceId));
      if (user && user.email && wsInfo) {
        const emailData = contributionReviewedEmail(
          user.name, 
          wsInfo.name, 
          parse.data.status, 
          parse.data.reviewComment || "No se dejó comentario adicional."
        );
        await sendEmail(user.email, emailData.subject, emailData.subject, emailData.html);
      }
    } catch (e) {
      console.error("Failed to send review email", e);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to review contribution" });
  }
});

export default router;
