import { Router, type IRouter } from "express";
import {
  db,
  forumPostsTable,
  forumRepliesTable,
  forumReactionsTable,
  activityEventsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ListPostsResponse,
  CreatePostBody,
  GetPostParams,
  GetPostResponse,
  CreateReplyParams,
  CreateReplyBody,
  ReactPostParams,
  ReactPostBody,
  ReactPostResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";

const router: IRouter = Router();

async function postsWithMeta(postIds: number[], currentUserId: string) {
  if (postIds.length === 0) return new Map();
  const replyCounts = await db
    .select({
      postId: forumRepliesTable.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(forumRepliesTable)
    .where(inArray(forumRepliesTable.postId, postIds))
    .groupBy(forumRepliesTable.postId);
  const reactionCounts = await db
    .select({
      postId: forumReactionsTable.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(forumReactionsTable)
    .where(inArray(forumReactionsTable.postId, postIds))
    .groupBy(forumReactionsTable.postId);
  const myReactions = await db
    .select()
    .from(forumReactionsTable)
    .where(
      and(
        inArray(forumReactionsTable.postId, postIds),
        eq(forumReactionsTable.userId, currentUserId),
      ),
    );
  const map = new Map<
    number,
    { replyCount: number; reactionCount: number; userReaction: string | null }
  >();
  for (const id of postIds)
    map.set(id, { replyCount: 0, reactionCount: 0, userReaction: null });
  for (const r of replyCounts)
    map.get(r.postId)!.replyCount = Number(r.count);
  for (const r of reactionCounts)
    map.get(r.postId)!.reactionCount = Number(r.count);
  for (const r of myReactions) map.get(r.postId)!.userReaction = r.reaction;
  return map;
}

router.get("/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(forumPostsTable)
    .orderBy(desc(forumPostsTable.createdAt))
    .limit(100);
  const meta = await postsWithMeta(
    rows.map((r) => r.id),
    userId,
  );
  const userMap = await fetchPublicUsers(rows.map((r) => r.userId));
  return res.json(
    ListPostsResponse.parse(
      rows.map((r) => {
        const m = meta.get(r.id)!;
        const u = userMap.get(r.userId) ?? {
          screenname: null,
          displayName: "Collector",
          avatarUrl: null,
        };
        return {
          id: r.id,
          userId: r.userId,
          userName: u.displayName,
          userAvatar: u.avatarUrl,
          title: r.title,
          body: r.body,
          category: r.category,
          replyCount: m.replyCount,
          reactionCount: m.reactionCount,
          userReaction: m.userReaction,
          createdAt: r.createdAt,
        };
      }),
    ),
  );
});

router.post("/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreatePostBody.parse(req.body);
  const [row] = await db
    .insert(forumPostsTable)
    .values({
      userId,
      title: body.title,
      body: body.body,
      category: body.category,
    })
    .returning();
  await db.insert(activityEventsTable).values({
    userId,
    kind: "forum_post",
    message: `Posted: "${row.title}"`,
  });
  const userMap = await fetchPublicUsers([userId]);
  const u = userMap.get(userId)!;
  return res.status(201).json({
    id: row.id,
    userId: row.userId,
    userName: u.displayName,
    userAvatar: u.avatarUrl,
    title: row.title,
    body: row.body,
    category: row.category,
    replyCount: 0,
    reactionCount: 0,
    userReaction: null,
    createdAt: row.createdAt,
  });
});

router.get("/posts/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = GetPostParams.parse(req.params);
  const [post] = await db
    .select()
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!post) return res.status(404).json({ error: "Not found" });
  const replies = await db
    .select()
    .from(forumRepliesTable)
    .where(eq(forumRepliesTable.postId, id))
    .orderBy(forumRepliesTable.createdAt);
  const meta = await postsWithMeta([id], userId);
  const userIds = [post.userId, ...replies.map((r) => r.userId)];
  const userMap = await fetchPublicUsers(userIds);
  const m = meta.get(id)!;
  const pu = userMap.get(post.userId)!;
  return res.json(
    GetPostResponse.parse({
      post: {
        id: post.id,
        userId: post.userId,
        userName: pu.displayName,
        userAvatar: pu.avatarUrl,
        title: post.title,
        body: post.body,
        category: post.category,
        replyCount: m.replyCount,
        reactionCount: m.reactionCount,
        userReaction: m.userReaction,
        createdAt: post.createdAt,
      },
      replies: replies.map((r) => {
        const u = userMap.get(r.userId)!;
        return {
          id: r.id,
          postId: r.postId,
          userId: r.userId,
          userName: u.displayName,
          userAvatar: u.avatarUrl,
          body: r.body,
          createdAt: r.createdAt,
        };
      }),
    }),
  );
});

router.post("/posts/:id/replies", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = CreateReplyParams.parse(req.params);
  const body = CreateReplyBody.parse(req.body);
  const [reply] = await db
    .insert(forumRepliesTable)
    .values({ postId: id, userId, body: body.body })
    .returning();
  const userMap = await fetchPublicUsers([userId]);
  const u = userMap.get(userId)!;
  return res.status(201).json({
    id: reply.id,
    postId: reply.postId,
    userId: reply.userId,
    userName: u.displayName,
    userAvatar: u.avatarUrl,
    body: reply.body,
    createdAt: reply.createdAt,
  });
});

router.post("/posts/:id/react", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = ReactPostParams.parse(req.params);
  const body = ReactPostBody.parse(req.body);

  await db
    .delete(forumReactionsTable)
    .where(
      and(
        eq(forumReactionsTable.postId, id),
        eq(forumReactionsTable.userId, userId),
      ),
    );
  if (body.reaction !== "none") {
    await db
      .insert(forumReactionsTable)
      .values({ postId: id, userId, reaction: body.reaction });
  }

  const [post] = await db
    .select()
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!post) return res.status(404).json({ error: "Not found" });
  const meta = await postsWithMeta([id], userId);
  const userMap = await fetchPublicUsers([post.userId]);
  const u = userMap.get(post.userId)!;
  const m = meta.get(id)!;
  return res.json(
    ReactPostResponse.parse({
      id: post.id,
      userId: post.userId,
      userName: u.displayName,
      userAvatar: u.avatarUrl,
      title: post.title,
      body: post.body,
      category: post.category,
      replyCount: m.replyCount,
      reactionCount: m.reactionCount,
      userReaction: m.userReaction,
      createdAt: post.createdAt,
    }),
  );
});

export default router;
