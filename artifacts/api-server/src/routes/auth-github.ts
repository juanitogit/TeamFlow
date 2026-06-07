// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession } from "./auth";
import { logger } from "../lib/logger";

const router = Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";

function getCallbackUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  return `${proto}://${host}/api/auth/github/callback`;
}

router.get("/github", (req: Request, res: Response) => {
  if (!CLIENT_ID) {
    res.status(503).json({ error: "GitHub OAuth not configured" });
    return;
  }
  const callbackUrl = getCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl,
    scope: "user:email read:user",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.redirect("/?error=github_denied");
    return;
  }

  try {
    const callbackUrl = getCallbackUrl(req);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      logger.error({ tokenData }, "GitHub OAuth token exchange failed");
      res.redirect("/login?error=github_failed");
      return;
    }

    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const ghUser = (await ghUserRes.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
      avatar_url?: string;
    };

    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
    }

    if (!email) {
      res.redirect("/login?error=no_github_email");
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    let user = existing[0];

    if (user) {
      await db
        .update(usersTable)
        .set({
          githubUsername: ghUser.login,
          avatarUrl: ghUser.avatar_url ?? user.avatarUrl,
        })
        .where(eq(usersTable.id, user.id));
      user = { ...user, githubUsername: ghUser.login, avatarUrl: ghUser.avatar_url ?? user.avatarUrl };
    } else {
      const [newUser] = await db
        .insert(usersTable)
        .values({
          name: ghUser.name ?? ghUser.login,
          email: email.toLowerCase(),
          passwordHash: "",
          role: "member",
          healthPoints: 100,
          performanceScore: 100,
          githubUsername: ghUser.login,
          avatarUrl: ghUser.avatar_url,
        })
        .returning();
      user = newUser;

      // Send welcome email
      const { sendEmail, welcomeEmail } = require("../services/email");
      const emailData = welcomeEmail(user.name, true);
      await sendEmail(user.email, emailData.subject, `Bienvenido a TeamFlow, ${user.name}!`, emailData.html);
    }

    const token = await createSession(user.id);

    res.redirect(`/login?token=${token}&github=1`);
  } catch (err) {
    logger.error({ err }, "GitHub OAuth callback error");
    res.redirect("/login?error=github_failed");
  }
});

export default router;
