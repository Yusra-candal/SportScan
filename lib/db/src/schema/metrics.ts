import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const metricsTable = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
  speed: real("speed").notNull(),
  endurance: real("endurance").notNull(),
  strength: real("strength").notNull(),
  agility: real("agility").notNull(),
  technique: real("technique").notNull(),
  teamwork: real("teamwork").notNull(),
  overallScore: real("overall_score").notNull(),
  notes: text("notes"),
  evaluationDate: text("evaluation_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMetricSchema = createInsertSchema(metricsTable).omit({ id: true, createdAt: true, overallScore: true });
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metricsTable.$inferSelect;
