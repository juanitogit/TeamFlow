// @ts-nocheck
import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const healthEventTypeEnum = pgEnum("health_event_type", [
  "completed_on_time",
  "completed_late",
  "task_overdue",
  "bonus",
]);

export const healthEventsTable = pgTable("health_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  eventType: healthEventTypeEnum("event_type").notNull(),
  delta: integer("delta").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHealthEventSchema = createInsertSchema(healthEventsTable).omit({ id: true, createdAt: true });
export type InsertHealthEvent = z.infer<typeof insertHealthEventSchema>;
export type HealthEvent = typeof healthEventsTable.$inferSelect;
