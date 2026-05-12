import { pgTable, text, serial, timestamp, numeric, index } from "drizzle-orm/pg-core";

export const tradePostsTable = pgTable(
  "trade_posts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    condition: text("condition").notNull(),
    askingPrice: numeric("asking_price", { precision: 12, scale: 2 }),
    photos: text("photos").array().notNull().default([]),
    kind: text("kind").notNull().default("trade"),
    wantedItems: text("wanted_items").array().notNull().default([]),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("trade_user_idx").on(t.userId),
    statusIdx: index("trade_status_idx").on(t.status),
  }),
);

export type TradePost = typeof tradePostsTable.$inferSelect;
