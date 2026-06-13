import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const sprintStatusEnum = pgEnum("sprint_status", ["planificacion", "activo", "completado"]);

export const sprintsTable = pgTable("sprints", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: sprintStatusEnum("status").notNull().default("planificacion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
