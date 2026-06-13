import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { usersTable } from "./users";

export const logTypeEnum = pgEnum("log_type", ["reunion", "documentacion", "revision", "soporte", "otro"]);

export const manualLogsTable = pgTable("manual_logs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  description: text("description").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  type: logTypeEnum("type").notNull().default("otro"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
