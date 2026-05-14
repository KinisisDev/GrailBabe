import { Router, type IRouter } from "express";
import {
  db,
  forumPostsTable,
  forumRepliesTable,
  forumVotesTable,
  activityEventsTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  CreateCommunityPostBody,
  CreateCommunityCommentBody,
  VoteCommunityPostBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";

const router: IRouter = Router();

function parseId(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

async function postSummaries(postIds: number[], currentUserId: string) {
  if (postIds.length === 0)
    return new Map<
      number,
      { score: number; commentCount: number; userVote: number }
    >();

  const scores = await db
    .select({
      postId: forumVotesTable.postId,
      score: sql<number>`coalesce(sum(${forumVotesTable.value}), 0)::int`,
    })
    .from(forumVotesTable)
    .where(inArray(forumVotesTable.postId, postIds))
    .groupBy(forumVotesTable.postId);

  const comments = await db
    .select({
      postId: forumRepliesTable.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(forumRepliesTable)
    .where(inArray(forumRepliesTable.postId, postIds))
    .groupBy(forumRepliesTable.postId);

  const myVotes = await db
    .select()
    .from(forumVotesTable)
    .where(
      and(
        inArray(forumVotesTable.postId, postIds),
        eq(forumVotesTable.userId, currentUserId),
      ),
    );

  const map = new Map<
    number,
    { score: number; commentCount: number; userVote: number }
  >();
  for (const id of postIds)
    map.set(id, { score: 0, commentCount: 0, userVote: 0 });
  for (const r of scores) map.get(r.postId)!.score = Number(r.score);
  for (const r of comments) map.get(r.postId)!.commentCount = Number(r.count);
  for (const v of myVotes) map.get(v.postId)!.userVote = v.value;
  return map;
}

function shapePost(
  row: typeof forumPostsTable.$inferSelect,
  meta: { score: number; commentCount: number; userVote: number },
  user: { id: string; displayName: string; avatarUrl: string | null },
) {
  return {
    id: row.id,
    authorId: row.userId,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl,
    category: row.category ?? "general",
    title: row.title,
    body: row.body,
    isPinned: row.isPinned,
    score: meta.score,
    userVote: meta.userVote,
    commentCount: meta.commentCount,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/community/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rawCategory = req.query.category;
  const rawSort = req.query.sort;
  const category =
    typeof rawCategory === "string" && rawCategory.length > 0
      ? rawCategory
      : null;
  const sort: "hot" | "new" | "top" =
    rawSort === "new" || rawSort === "top" ? rawSort : "hot";

  // Privacy: community posts are author-private. Each user only sees their
  // own posts. The only data exposed to other users is the public trade board.
  const ownerFilter = eq(forumPostsTable.userId, userId);
  const where = category
    ? and(ownerFilter, eq(forumPostsTable.category, category))
    : ownerFilter;

  // Sort by score in SQL (pinned first) so we don't drop high-score
  // older posts when limiting. Score is a correlated subquery on votes.
  const scoreSql = sql<number>`(select coalesce(sum(${forumVotesTable.value}), 0)::int from ${forumVotesTable} where ${forumVotesTable.postId} = ${forumPostsTable.id})`;

  const orderBy =
    sort === "new"
      ? [desc(forumPostsTable.isPinned), desc(forumPostsTable.createdAt)]
      : // 'hot' and 'top' both sort by score desc, tiebreak by recency.
        [
          desc(forumPostsTable.isPinned),
          desc(scoreSql),
          desc(forumPostsTable.createdAt),
        ];

  const rows = await db
    .select()
    .from(forumPostsTable)
    .where(where ?? sql`true`)
    .orderBy(...orderBy)
    .limit(200);

  const meta = await postSummaries(
    rows.map((r) => r.id),
    userId,
  );
  const userMap = await fetchPublicUsers(rows.map((r) => r.userId));

  const summaries = rows.map((r) => {
    const u = userMap.get(r.userId) ?? {
      id: r.userId,
      displayName: "Collector",
      avatarUrl: null,
    };
    return shapePost(r, meta.get(r.id)!, u);
  });

  return res.json(summaries);
});

router.post("/community/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateCommunityPostBody.parse(req.body);

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
  const u = userMap.get(userId) ?? {
    id: userId,
    displayName: "Collector",
    avatarUrl: null,
  };

  return res.status(201).json(
    shapePost(
      row,
      { score: 0, commentCount: 0, userVote: 0 },
      u,
    ),
  );
});

router.get("/community/posts/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = parseId(req.params.id);
  if (id == null) return res.status(400).json({ error: "Bad id" });

  const [row] = await db
    .select()
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!row || row.userId !== userId)
    return res.status(404).json({ error: "Not found" });

  const meta = await postSummaries([id], userId);
  const userMap = await fetchPublicUsers([row.userId]);
  const u = userMap.get(row.userId) ?? {
    id: row.userId,
    displayName: "Collector",
    avatarUrl: null,
  };
  return res.json(shapePost(row, meta.get(id)!, u));
});

router.get("/community/posts/:id/comments", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = parseId(req.params.id);
  if (id == null) return res.status(400).json({ error: "Bad id" });

  const [post] = await db
    .select({ userId: forumPostsTable.userId })
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!post || post.userId !== userId)
    return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select()
    .from(forumRepliesTable)
    .where(eq(forumRepliesTable.postId, id))
    .orderBy(asc(forumRepliesTable.createdAt));
  const userMap = await fetchPublicUsers(rows.map((r) => r.userId));

  return res.json(
    rows.map((r) => {
      const u = userMap.get(r.userId) ?? {
        id: r.userId,
        displayName: "Collector",
        avatarUrl: null,
      };
      return {
        id: r.id,
        postId: r.postId,
        authorId: r.userId,
        authorName: u.displayName,
        authorAvatar: u.avatarUrl,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      };
    }),
  );
});

router.post("/community/posts/:id/comments", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = parseId(req.params.id);
  if (id == null) return res.status(400).json({ error: "Bad id" });

  const [post] = await db
    .select({ id: forumPostsTable.id, userId: forumPostsTable.userId })
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!post || post.userId !== userId)
    return res.status(404).json({ error: "Post not found" });

  const body = CreateCommunityCommentBody.parse(req.body);
  const [row] = await db
    .insert(forumRepliesTable)
    .values({ postId: id, userId, body: body.body })
    .returning();

  const userMap = await fetchPublicUsers([userId]);
  const u = userMap.get(userId) ?? {
    id: userId,
    displayName: "Collector",
    avatarUrl: null,
  };

  return res.status(201).json({
    id: row.id,
    postId: row.postId,
    authorId: row.userId,
    authorName: u.displayName,
    authorAvatar: u.avatarUrl,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  });
});

router.post("/community/posts/:id/vote", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = parseId(req.params.id);
  if (id == null) return res.status(400).json({ error: "Bad id" });

  const [post] = await db
    .select()
    .from(forumPostsTable)
    .where(eq(forumPostsTable.id, id))
    .limit(1);
  if (!post || post.userId !== userId)
    return res.status(404).json({ error: "Not found" });

  const body = VoteCommunityPostBody.parse(req.body);

  // Atomic toggle: serialize per (post,user) inside a transaction to avoid
  // PK conflicts and nondeterministic state from concurrent up/down clicks.
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(forumVotesTable)
      .where(
        and(
          eq(forumVotesTable.postId, id),
          eq(forumVotesTable.userId, userId),
        ),
      )
      .for("update")
      .limit(1);

    if (!existing) {
      await tx
        .insert(forumVotesTable)
        .values({ postId: id, userId, value: body.value })
        .onConflictDoUpdate({
          target: [forumVotesTable.postId, forumVotesTable.userId],
          set: { value: body.value },
        });
    } else if (existing.value === body.value) {
      await tx
        .delete(forumVotesTable)
        .where(
          and(
            eq(forumVotesTable.postId, id),
            eq(forumVotesTable.userId, userId),
          ),
        );
    } else {
      await tx
        .update(forumVotesTable)
        .set({ value: body.value })
        .where(
          and(
            eq(forumVotesTable.postId, id),
            eq(forumVotesTable.userId, userId),
          ),
        );
    }
  });

  const meta = await postSummaries([id], userId);
  const userMap = await fetchPublicUsers([post.userId]);
  const u = userMap.get(post.userId) ?? {
    id: post.userId,
    displayName: "Collector",
    avatarUrl: null,
  };
  return res.json(shapePost(post, meta.get(id)!, u));
});

export default router;
