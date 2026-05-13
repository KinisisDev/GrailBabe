import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { collectionItemsTable } from "./collectionItems";

export const vaultItemImagesTable = pgTable(
  "vault_item_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultItemId: integer("vault_item_id")
      .notNull()
      .references(() => collectionItemsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    storagePath: text("storage_path").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    vaultItemIdx: index("vault_item_images_vault_item_idx").on(t.vaultItemId),
    userIdx: index("vault_item_images_user_idx").on(t.userId),
    onePrimaryPerItem: uniqueIndex("vault_item_images_one_primary_idx")
      .on(t.vaultItemId)
      .where(sql`${t.isPrimary} = true`),
  }),
);

export type VaultItemImage = typeof vaultItemImagesTable.$inferSelect;
