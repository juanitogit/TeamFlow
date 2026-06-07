// @ts-nocheck
import { pgTable, text, serial, timestamp, integer, real, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const taskTypeEnum = pgEnum("task_type", ["programming", "documentation", "research"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "overdue"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: taskTypeEnum("type").notNull().default("programming"),
  status: taskStatusEnum("status").notNull().default("pending"),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  assigneeId: integer("assignee_id").notNull().references(() => usersTable.id),
  workloadPct: real("workload_pct").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  githubCommitSha: text("github_commit_sha"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
