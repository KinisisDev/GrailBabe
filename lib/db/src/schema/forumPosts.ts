import { pgTable, text, serial, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

export const forumPostsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumRepliesTable = pgTable(
  "post_replies",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    userId: text("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    postIdx: index("post_replies_post_idx").on(t.postId),
  }),
);

export const forumReactionsTable = pgTable(
  "post_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    userId: text("user_id").notNull(),
    reaction: text("reaction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("post_reactions_user_post_uniq").on(t.postId, t.userId),
  }),
);

export type ForumPost = typeof forumPostsTable.$inferSelect;
export type ForumReply = typeof forumRepliesTable.$inferSelect;
export type ForumReaction = typeof forumReactionsTable.$inferSelect;
