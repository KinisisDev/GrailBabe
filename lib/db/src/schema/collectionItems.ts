import { pgTable, text, serial, timestamp, numeric, boolean, date, index } from "drizzle-orm/pg-core";

export const collectionItemsTable = pgTable(
  "collection_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category").notNull(),
    condition: text("condition").notNull(),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
    currentValue: numeric("current_value", { precision: 12, scale: 2 }),
    purchaseDate: date("purchase_date"),
    notes: text("notes"),
    photos: text("photos").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    sku: text("sku"),
    favorite: boolean("favorite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdx: index("collection_items_user_idx").on(t.userId),
    categoryIdx: index("collection_items_category_idx").on(t.category),
  }),
);

export type CollectionItem = typeof collectionItemsTable.$inferSelect;
