import { pgTable, text, serial, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const suggestionTypeEnum = pgEnum("suggestion_type", ["pr_merged", "task_overdue", "member_inactive"]);
export const suggestionStatusEnum = pgEnum("suggestion_status", ["pending", "accepted", "dismissed"]);

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  type: suggestionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: jsonb("data"), // Stores PR info, Task info, etc
  status: suggestionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
