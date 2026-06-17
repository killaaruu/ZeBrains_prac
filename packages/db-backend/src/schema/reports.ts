import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const reportStatusEnum = pgEnum("report_status", ["queued", "thinking", "done", "error"]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    topic: text("topic").notNull(),
    status: reportStatusEnum("status").default("queued").notNull(),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("reports_user_id_idx").on(t.userId),
    index("reports_status_idx").on(t.status),
    index("reports_created_at_idx").on(t.createdAt),
  ],
);
