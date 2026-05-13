import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  numeric,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const tradePostsTable = pgTable(
  "trade_posts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    requesterId: text("requester_id"),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    condition: text("condition").notNull(),
    askingPrice: numeric("asking_price", { precision: 12, scale: 2 }),
    photos: text("photos").array().notNull().default([]),
    kind: text("kind").notNull().default("trade"),
    wantedItems: text("wanted_items").array().notNull().default([]),
    status: text("status").notNull().default("open"),
    completionConfirmedByPoster: boolean("completion_confirmed_by_poster")
      .notNull()
      .default(false),
    completionConfirmedByRequester: boolean("completion_confirmed_by_requester")
      .notNull()
      .default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("trade_user_idx").on(t.userId),
    statusIdx: index("trade_status_idx").on(t.status),
    requesterIdx: index("trade_requester_idx").on(t.requesterId),
  }),
);

export type TradePost = typeof tradePostsTable.$inferSelect;

export const tradeReviewsTable = pgTable(
  "trade_reviews",
  {
    id: serial("id").primaryKey(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => tradePostsTable.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").notNull(),
    reviewedUserId: text("reviewed_user_id").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqReviewer: unique("trade_reviews_trade_reviewer_uniq").on(
      t.tradeId,
      t.reviewerId,
    ),
    reviewedIdx: index("trade_reviews_reviewed_idx").on(t.reviewedUserId),
    tradeIdx: index("trade_reviews_trade_idx").on(t.tradeId),
  }),
);

export type TradeReview = typeof tradeReviewsTable.$inferSelect;
