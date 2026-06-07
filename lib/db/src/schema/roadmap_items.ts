// @ts-nocheck
import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roadmapStatusEnum = pgEnum("roadmap_status", ["planned", "in_progress", "achieved", "missed"]);

export const roadmapItemsTable = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: roadmapStatusEnum("status").notNull().default("planned"),
  assignedUserIds: integer("assigned_user_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRoadmapItemSchema = createInsertSchema(roadmapItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoadmapItem = z.infer<typeof insertRoadmapItemSchema>;
export type RoadmapItem = typeof roadmapItemsTable.$inferSelect;
