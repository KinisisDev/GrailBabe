import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const activityEventsTable = pgTable(
  "activity_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    itemId: integer("item_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("activity_user_idx").on(t.userId),
  }),
);

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
