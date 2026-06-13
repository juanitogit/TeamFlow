// @ts-nocheck
import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  githubRepoUrl: text("github_repo_url"), // Deprecated, keeping for backwards compatibility
  githubRepos: text("github_repos").default("[]"), // Stored as JSON string
  inviteCode: text("invite_code").notNull().unique(),
  inviteCodeExpiresAt: timestamp("invite_code_expires_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({ id: true, createdAt: true });
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;
