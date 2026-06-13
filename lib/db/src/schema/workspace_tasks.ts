// @ts-nocheck
import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export const wsTaskTypeEnum = pgEnum("ws_task_type", ["programacion", "documentacion", "investigacion"]);
export const wsTaskStatusEnum = pgEnum("ws_task_status", ["pendiente", "en_progreso", "en_revision", "completada", "vencida"]);

export const workspaceTasksTable = pgTable("workspace_tasks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  assignedTo: integer("assigned_to").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  assignedBy: integer("assigned_by").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  type: wsTaskTypeEnum("type").notNull(),
  status: wsTaskStatusEnum("status").notNull(),
  commitSha: text("commit_sha"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
