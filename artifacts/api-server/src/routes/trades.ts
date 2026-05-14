import { Router, type IRouter } from "express";
import {
  db,
  tradePostsTable,
  tradeReviewsTable,
  activityEventsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  ListTradesQueryParams,
  ListTradesResponse,
  CreateTradeBody,
  GetTradeParams,
  GetTradeResponse,
  DeleteTradeParams,
  ListMyTradesQueryParams,
  LeaveTradeReviewBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";
import { userProfilesTable, collectionItemsTable } from "@workspace/db";

const router: IRouter = Router();

function serialize(
  row: typeof tradePostsTable.$inferSelect,
  user: {
    screenname?: string | null;
    displayName: string;
    avatarUrl: string | null;
  },
) {
  return {
    id: row.id,
    userId: row.userId,
    userName: user.displayName,
    userAvatar: user.avatarUrl,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    askingPrice: row.askingPrice ? Number(row.askingPrice) : null,
    photos: row.photos ?? [],
    kind: row.kind as "trade" | "sell" | "buy",
    wantedItems: row.wantedItems ?? [],
    vaultItemId: row.vaultItemId,
    status: row.status as
      | "open"
      | "pending"
      | "completed"
      | "cancelled"
      | "closed",
    createdAt: row.createdAt,
  };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

async function shapeMyTrade(
  row: typeof tradePostsTable.$inferSelect,
  meId: string,
  reviewsForTrade: Array<typeof tradeReviewsTable.$inferSelect>,
) {
  const role: "poster" | "requester" =
    row.userId === meId ? "poster" : "requester";
  const otherId = role === "poster" ? row.requesterId : row.userId;

  let otherParty: {
    id: string;
    screenname: string;
    displayName: string;
    initials: string;
    avatarUrl: string | null;
  } | null = null;

  if (otherId) {
    const [otherProfile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, otherId))
      .limit(1);
    if (otherProfile) {
      const screenname = otherProfile.screenname ?? "collector";
      const displayName = otherProfile.displayName ?? "Collector";
      otherParty = {
        id: otherProfile.id,
        screenname,
        displayName,
        initials: initialsOf(displayName),
        avatarUrl: otherProfile.avatarUrl,
      };
    } else {
      const map = await fetchPublicUsers([otherId]);
      const u = map.get(otherId);
      otherParty = {
        id: otherId,
        screenname: "collector",
        displayName: u?.displayName ?? "Collector",
        initials: initialsOf(u?.displayName ?? "Collector"),
        avatarUrl: u?.avatarUrl ?? null,
      };
    }
  }

  const myConfirmed =
    role === "poster"
      ? row.completionConfirmedByPoster
      : row.completionConfirmedByRequester;
  const theirConfirmed =
    role === "poster"
      ? row.completionConfirmedByRequester
      : row.completionConfirmedByPoster;

  const myReview = reviewsForTrade.find((r) => r.reviewerId === meId);
  const theirReview = reviewsForTrade.find((r) => r.reviewerId !== meId);

  return {
    id: row.id,
    role,
    status: row.status as
      | "open"
      | "pending"
      | "completed"
      | "cancelled"
      | "closed",
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    askingPrice: row.askingPrice ? Number(row.askingPrice) : null,
    kind: row.kind as "trade" | "sell" | "buy",
    wantedItems: row.wantedItems ?? [],
    photos: row.photos ?? [],
    vaultItemId: row.vaultItemId,
    otherParty,
    myConfirmed,
    theirConfirmed,
    postedAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    myReview: myReview
      ? {
          rating: myReview.rating,
          comment: myReview.comment,
          createdAt: myReview.createdAt.toISOString(),
        }
      : null,
    theirReview: theirReview
      ? {
          rating: theirReview.rating,
          comment: null,
          createdAt: theirReview.createdAt.toISOString(),
        }
      : null,
  };
}

router.get("/trades", requireAuth, async (req, res) => {
  const q = ListTradesQueryParams.parse(req.query);
  const filters = [eq(tradePostsTable.status, "open")];
  if (q.category) filters.push(eq(tradePostsTable.category, q.category));
  const rows = await db
    .select()
    .from(tradePostsTable)
    .where(and(...filters))
    .orderBy(desc(tradePostsTable.createdAt))
    .limit(100);
  const userMap = await fetchPublicUsers(rows.map((r) => r.userId));
  return res.json(
    ListTradesResponse.parse(
      rows.map((r) =>
        serialize(
          r,
          userMap.get(r.userId) ?? {
            screenname: null,
            displayName: "Collector",
            avatarUrl: null,
          },
        ),
      ),
    ),
  );
});

router.get("/trades/mine", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const q = ListMyTradesQueryParams.parse(req.query);
  const wherePartyOf = or(
    eq(tradePostsTable.userId, userId),
    eq(tradePostsTable.requesterId, userId),
  )!;
  const filters = [wherePartyOf];
  if (q.status && q.status !== "all") {
    filters.push(eq(tradePostsTable.status, q.status));
  }
  const rows = await db
    .select()
    .from(tradePostsTable)
    .where(and(...filters))
    .orderBy(desc(tradePostsTable.createdAt))
    .limit(200);

  const tradeIds = rows.map((r) => r.id);
  const reviews =
    tradeIds.length > 0
      ? await db
          .select()
          .from(tradeReviewsTable)
          .where(inArray(tradeReviewsTable.tradeId, tradeIds))
      : [];
  const reviewsByTrade = new Map<
    number,
    Array<typeof tradeReviewsTable.$inferSelect>
  >();
  for (const r of reviews) {
    const arr = reviewsByTrade.get(r.tradeId) ?? [];
    arr.push(r);
    reviewsByTrade.set(r.tradeId, arr);
  }

  const out = await Promise.all(
    rows.map((r) =>
      shapeMyTrade(r, userId, reviewsByTrade.get(r.id) ?? []),
    ),
  );
  return res.json(out);
});

router.post("/trades", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateTradeBody.parse(req.body);
  if (body.vaultItemId != null) {
    const [item] = await db
      .select({ id: collectionItemsTable.id })
      .from(collectionItemsTable)
      .where(
        and(
          eq(collectionItemsTable.id, body.vaultItemId),
          eq(collectionItemsTable.userId, userId),
        ),
      )
      .limit(1);
    if (!item) {
      return res
        .status(400)
        .json({ error: "Vault item not found or not owned by you." });
    }
    const [existing] = await db
      .select({ id: tradePostsTable.id })
      .from(tradePostsTable)
      .where(
        and(
          eq(tradePostsTable.userId, userId),
          eq(tradePostsTable.vaultItemId, body.vaultItemId),
          inArray(tradePostsTable.status, ["open", "pending"]),
        ),
      )
      .limit(1);
    if (existing) {
      return res
        .status(409)
        .json({ error: "This vault item already has an active trade." });
    }
  }
  const [row] = await db
    .insert(tradePostsTable)
    .values({
      userId,
      title: body.title,
      description: body.description,
      category: body.category,
      condition: body.condition,
      askingPrice: body.askingPrice?.toString(),
      photos: body.photos ?? [],
      kind: body.kind,
      wantedItems: body.wantedItems ?? [],
      vaultItemId: body.vaultItemId ?? null,
    })
    .returning();
  await db.insert(activityEventsTable).values({
    userId,
    kind: "trade_post",
    message: `Posted trade: "${row.title}"`,
  });
  const userMap = await fetchPublicUsers([userId]);
  return res
    .status(201)
    .json(
      serialize(
        row,
        userMap.get(userId) ?? { screenname: null, displayName: "Collector", avatarUrl: null },
      ),
    );
});

router.get("/trades/:id", requireAuth, async (req, res) => {
  const { id } = GetTradeParams.parse(req.params);
  const [row] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  const userMap = await fetchPublicUsers([row.userId]);
  return res.json(
    GetTradeResponse.parse(
      serialize(
        row,
        userMap.get(row.userId) ?? {
          screenname: null,
          displayName: "Collector",
          avatarUrl: null,
        },
      ),
    ),
  );
});

router.delete("/trades/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = DeleteTradeParams.parse(req.params);
  const result = await db
    .delete(tradePostsTable)
    .where(and(eq(tradePostsTable.id, id), eq(tradePostsTable.userId, userId)))
    .returning({ id: tradePostsTable.id });
  if (result.length === 0) return res.status(404).json({ error: "Not found" });
  return res.status(204).end();
});

async function loadAndShape(id: number, meId: string) {
  const [row] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!row) return null;
  const reviews = await db
    .select()
    .from(tradeReviewsTable)
    .where(eq(tradeReviewsTable.tradeId, id));
  return shapeMyTrade(row, meId, reviews);
}

router.post("/trades/:id/offer", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const [trade] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.userId === userId)
    return res.status(400).json({ error: "Cannot offer on your own listing" });
  if (trade.status !== "open")
    return res.status(409).json({ error: "Trade is not open" });

  // Atomic conditional claim — prevents two requesters racing to overwrite each other.
  const claimed = await db
    .update(tradePostsTable)
    .set({ requesterId: userId, status: "pending" })
    .where(
      and(
        eq(tradePostsTable.id, id),
        eq(tradePostsTable.status, "open"),
        sql`${tradePostsTable.requesterId} IS NULL`,
      ),
    )
    .returning({ id: tradePostsTable.id });
  if (claimed.length === 0)
    return res.status(409).json({ error: "Someone already claimed this trade" });

  const shaped = await loadAndShape(id, userId);
  return res.json(shaped);
});

router.post("/trades/:id/confirm-complete", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const [trade] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  const isPoster = trade.userId === userId;
  const isRequester = trade.requesterId === userId;
  if (!isPoster && !isRequester)
    return res.status(403).json({ error: "Not your trade" });
  if (trade.status !== "pending" && trade.status !== "completed")
    return res.status(409).json({ error: "Trade not in confirmable state" });

  const posterConfirmed = isPoster ? true : trade.completionConfirmedByPoster;
  const requesterConfirmed = isRequester
    ? true
    : trade.completionConfirmedByRequester;
  const bothConfirmed = posterConfirmed && requesterConfirmed;

  await db
    .update(tradePostsTable)
    .set({
      completionConfirmedByPoster: posterConfirmed,
      completionConfirmedByRequester: requesterConfirmed,
      status: bothConfirmed ? "completed" : trade.status,
      completedAt: bothConfirmed ? new Date() : trade.completedAt,
    })
    .where(eq(tradePostsTable.id, id));

  const shaped = await loadAndShape(id, userId);
  return res.json(shaped);
});

router.post("/trades/:id/cancel", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const [trade] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  const isPoster = trade.userId === userId;
  const isRequester = trade.requesterId === userId;
  if (trade.status === "open") {
    if (!isPoster)
      return res
        .status(403)
        .json({ error: "Only the poster can cancel an open listing" });
  } else if (trade.status === "pending") {
    if (!isPoster && !isRequester)
      return res.status(403).json({ error: "Not your trade" });
  } else {
    return res.status(409).json({ error: "Trade cannot be cancelled" });
  }

  await db
    .update(tradePostsTable)
    .set({ status: "cancelled" })
    .where(eq(tradePostsTable.id, id));

  const shaped = await loadAndShape(id, userId);
  return res.json(shaped);
});

router.post("/trades/:id/review", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const body = LeaveTradeReviewBody.parse(req.body);

  const [trade] = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.id, id))
    .limit(1);
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (trade.status !== "completed")
    return res.status(409).json({ error: "Trade not completed" });
  const isPoster = trade.userId === userId;
  const isRequester = trade.requesterId === userId;
  if (!isPoster && !isRequester)
    return res.status(403).json({ error: "Not your trade" });
  const reviewedUserId = isPoster ? trade.requesterId : trade.userId;
  if (!reviewedUserId)
    return res.status(409).json({ error: "No counterparty to review" });
  if (reviewedUserId === userId)
    return res.status(400).json({ error: "Cannot review yourself" });

  try {
    await db.insert(tradeReviewsTable).values({
      tradeId: id,
      reviewerId: userId,
      reviewedUserId,
      rating: body.rating,
      comment: body.comment ?? null,
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return res
        .status(409)
        .json({ error: "You already reviewed this trade" });
    }
    throw err;
  }

  const shaped = await loadAndShape(id, userId);
  return res.status(201).json(shaped);
});

router.get("/users/:userId/reviews", requireAuth, async (req, res) => {
  const targetId = String(req.params.userId ?? "");
  if (!targetId) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select()
    .from(tradeReviewsTable)
    .where(eq(tradeReviewsTable.reviewedUserId, targetId))
    .orderBy(desc(tradeReviewsTable.createdAt))
    .limit(100);

  const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewerId)));
  const reviewerProfiles =
    reviewerIds.length > 0
      ? await db
          .select()
          .from(userProfilesTable)
          .where(inArray(userProfilesTable.id, reviewerIds))
      : [];
  const profMap = new Map(reviewerProfiles.map((p) => [p.id, p]));
  const fallbackMap = await fetchPublicUsers(reviewerIds);

  const out = rows.map((r) => {
    const prof = profMap.get(r.reviewerId);
    const displayName =
      prof?.displayName ??
      fallbackMap.get(r.reviewerId)?.displayName ??
      "Collector";
    const screenname = prof?.screenname ?? "collector";
    return {
      id: r.id,
      tradeId: r.tradeId,
      rating: r.rating,
      comment: r.comment,
      reviewerId: r.reviewerId,
      reviewerScreenname: screenname,
      reviewerInitials: initialsOf(displayName),
      createdAt: r.createdAt.toISOString(),
    };
  });

  return res.json(out);
});

export default router;
