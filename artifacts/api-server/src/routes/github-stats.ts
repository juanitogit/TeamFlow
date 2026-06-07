// @ts-nocheck
import { Router, Request, Response } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// Fetch commits from a GitHub repo using the GitHub API
async function fetchGithubCommits(repoUrl: string, since?: string, until?: string): Promise<any[]> {
  // Extract owner/repo from URL like https://github.com/owner/repo
  const match = repoUrl.replace(/\.git$/, "").match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return [];

  const [, owner, repo] = match;
  let apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;

  if (since) apiUrl += `&since=${since}`;
  if (until) apiUrl += `&until=${until}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TeamFlow-App",
  };

  // Removed invalid OAuth secret usage for Bearer token. Public repos don't need auth,
  // and using client_secret as token causes 401 Unauthorized errors.

  const allCommits: any[] = [];
  let page = 1;
  const maxPages = 5; // Cap at 500 commits

  while (page <= maxPages) {
    try {
      const res = await fetch(`${apiUrl}&page=${page}`, { headers });
      if (!res.ok) {
        console.error(`[GitHub Stats] Error fetching commits for ${owner}/${repo}: ${res.status}`);
        break;
      }
      const commits = await res.json();
      if (!Array.isArray(commits) || commits.length === 0) break;
      allCommits.push(...commits);
      if (commits.length < 100) break;
      page++;
    } catch (err) {
      console.error(`[GitHub Stats] Network error fetching commits:`, err);
      break;
    }
  }

  return allCommits;
}

// GET /workspaces/:id/github-commits?repo=<url>&period=week|month|year|day|custom&since=<ISO>&until=<ISO>
router.get("/:id/github-commits", async (req: AuthedRequest, res: Response) => {
  const workspaceId = parseInt(req.params.id);
  const userId = req.userId!;
  const repoUrl = req.query.repo as string;
  const period = (req.query.period as string) || "week";
  let since = req.query.since as string | undefined;
  let until = req.query.until as string | undefined;

  try {
    // Check membership
    const [membership] = await db.select()
      .from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "No eres miembro de este workspace" });
      return;
    }

    // Get workspace to verify repo belongs to it
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
    if (!workspace) {
      res.status(404).json({ error: "Workspace no encontrado" });
      return;
    }

    let repos: string[] = [];
    try { repos = JSON.parse(workspace.githubRepos || "[]"); } catch { repos = []; }

    if (repoUrl && !repos.includes(repoUrl)) {
      res.status(400).json({ error: "Este repositorio no está vinculado al workspace" });
      return;
    }

    // Calculate date range based on period
    if (!since || !until) {
      const now = new Date();
      until = now.toISOString();

      switch (period) {
        case "day":
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case "week":
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case "month":
          since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
          break;
        case "year":
          since = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
          break;
        default:
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Fetch commits from selected repo or all repos
    const targetRepos = repoUrl ? [repoUrl] : repos;
    const allCommits: any[] = [];

    for (const repo of targetRepos) {
      const commits = await fetchGithubCommits(repo, since, until);
      allCommits.push(...commits.map(c => ({
        sha: c.sha,
        message: c.commit?.message || "",
        date: c.commit?.author?.date || c.commit?.committer?.date,
        authorLogin: c.author?.login || c.commit?.author?.name || "unknown",
        authorName: c.commit?.author?.name || c.author?.login || "unknown",
        authorAvatar: c.author?.avatar_url || null,
        repo: repo.replace("https://github.com/", ""),
      })));
    }

    // Get workspace members with their github usernames
    const members = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      githubUsername: usersTable.githubUsername,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(workspaceMembersTable)
    .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    // Group commits by author
    const commitsByAuthor: Record<string, { 
      name: string; 
      login: string; 
      avatar: string | null;
      memberId: number | null;
      commits: number; 
      repos: Record<string, number>;
    }> = {};

    for (const commit of allCommits) {
      const login = commit.authorLogin.toLowerCase();
      if (!commitsByAuthor[login]) {
        // Try to match to a workspace member
        const matchedMember = members.find(m => 
          m.githubUsername?.toLowerCase() === login
        );

        commitsByAuthor[login] = {
          name: matchedMember?.name || commit.authorName,
          login: commit.authorLogin,
          avatar: commit.authorAvatar || matchedMember?.avatarUrl || null,
          memberId: matchedMember?.id || null,
          commits: 0,
          repos: {},
        };
      }
      commitsByAuthor[login].commits++;
      const repoName = commit.repo;
      commitsByAuthor[login].repos[repoName] = (commitsByAuthor[login].repos[repoName] || 0) + 1;
    }

    // Convert to sorted array
    const authors = Object.values(commitsByAuthor)
      .sort((a, b) => b.commits - a.commits);

    res.json({
      totalCommits: allCommits.length,
      period,
      since,
      until,
      repos: targetRepos.map(r => r.replace("https://github.com/", "")),
      authors,
    });
  } catch (error) {
    console.error("[GitHub Stats] Error:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de GitHub" });
  }
});

export default router;
