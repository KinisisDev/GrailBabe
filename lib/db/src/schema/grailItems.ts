import { pgTable, text, serial, timestamp, numeric, boolean, index } from "drizzle-orm/pg-core";

export const grailItemsTable = pgTable(
  "grail_list_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    targetPrice: numeric("target_price", { precision: 12, scale: 2 }),
    notes: text("notes"),
    imageUrl: text("image_url"),
    priority: text("priority").notNull().default("medium"),
    acquired: boolean("acquired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("grail_user_idx").on(t.userId),
  }),
);

export type GrailItem = typeof grailItemsTable.$inferSelect;
