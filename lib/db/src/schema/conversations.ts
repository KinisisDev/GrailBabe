import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    participantA: text("participant_a").notNull(),
    participantB: text("participant_b").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pairUnique: uniqueIndex("conversations_pair_uniq").on(
      t.participantA,
      t.participantB,
    ),
  }),
);

export type Conversation = typeof conversationsTable.$inferSelect;
