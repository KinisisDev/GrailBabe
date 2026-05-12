import { pgTable, serial, integer, numeric, text, timestamp, index } from "drizzle-orm/pg-core";

export const priceSnapshotsTable = pgTable(
  "price_snapshots",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    source: text("source").notNull().default("manual"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    itemIdx: index("price_snapshots_item_idx").on(t.itemId),
  }),
);

export type PriceSnapshot = typeof priceSnapshotsTable.$inferSelect;
