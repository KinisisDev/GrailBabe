import { Router, type IRouter } from "express";
import {
  db,
  userProfilesTable,
  collectionItemsTable,
  grailItemsTable,
  forumPostsTable,
  forumVotesTable,
  forumRepliesTable,
  tradePostsTable,
  tradeReviewsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  CreateProfileBody,
  UpdateProfileBody,
  ChangeScreennameBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const SCREENNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000;
const FORMER_NAME_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

function validateScreenname(s: string): string | null {
  if (!s) return "Required";
  if (s.length < 3) return "At least 3 characters";
  if (s.length > 20) return "At most 20 characters";
  if (!SCREENNAME_RE.test(s))
    return "Letters, numbers, and underscores only";
  return null;
}

async function geocode(
  city: string,
  region: string | null | undefined,
  country: string,
): Promise<{ lat: number; lng: number } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("city", city);
    if (region) url.searchParams.set("state", region);
    url.searchParams.set("country", country);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": "GrailBabe/1.0 (collectibles app)" },
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function shapeMine(p: typeof userProfilesTable.$inferSelect) {
  return {
    id: p.id,
    email: p.email,
    screenname: p.screenname,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    city: p.city,
    region: p.region,
    postalCode: p.postalCode,
    country: p.country ?? "US",
    lat: p.lat,
    lng: p.lng,
    tier: p.tier,
    onboardingComplete: p.onboardingComplete,
    screennameChangedAt: p.screennameChangedAt
      ? p.screennameChangedAt.toISOString()
      : null,
    formerScreenname: p.formerScreenname,
    formerScreennameChangedAt: p.formerScreennameChangedAt
      ? p.formerScreennameChangedAt.toISOString()
      : null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/profiles/check-screenname", requireAuth, async (req, res) => {
  const raw = req.query.screenname;
  const s = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
  if (!s) return res.json({ available: false, valid: false, reason: "Required" });

  const reason = validateScreenname(s);
  if (reason) return res.json({ available: false, valid: false, reason });

  const userId = req.userId!;
  const [taken] = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(
      and(
        sql`lower(${userProfilesTable.screenname}) = ${s.toLowerCase()}`,
        ne(userProfilesTable.id, userId),
      ),
    )
    .limit(1);

  return res.json({
    available: !taken,
    valid: true,
    reason: taken ? "Already taken" : null,
  });
});

router.post("/profiles", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateProfileBody.parse(req.body);

  const reason = validateScreenname(body.screenname);
  if (reason) return res.status(400).json({ error: reason });

  // Atomic uniqueness check on lowercase screenname.
  const [taken] = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(
      and(
        sql`lower(${userProfilesTable.screenname}) = ${body.screenname.toLowerCase()}`,
        ne(userProfilesTable.id, userId),
      ),
    )
    .limit(1);
  if (taken) return res.status(409).json({ error: "Screenname taken" });

  const coords = await geocode(body.city, body.region, body.country);

  // TODO: when Clerk publicMetadata is wired, also call
  // clerkClient.users.updateUserMetadata(userId, { publicMetadata: { onboardingComplete: true } })
  let updated;
  try {
    [updated] = await db
      .update(userProfilesTable)
      .set({
        screenname: body.screenname,
        displayName: body.displayName ?? undefined,
        bio: body.bio ?? undefined,
        city: body.city,
        region: body.region ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        onboardingComplete: true,
        screennameChangedAt: new Date(),
      })
      .where(eq(userProfilesTable.id, userId))
      .returning();
  } catch (err) {
    if (isUniqueViolation(err))
      return res.status(409).json({ error: "Screenname taken" });
    throw err;
  }

  if (!updated) return res.status(404).json({ error: "Profile not found" });
  return res.status(201).json(shapeMine(updated));
});

router.get("/profiles/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [p] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!p) return res.status(404).json({ error: "Profile not found" });
  return res.json(shapeMine(p));
});

router.patch("/profiles/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = UpdateProfileBody.parse(req.body);

  const [current] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!current) return res.status(404).json({ error: "Profile not found" });

  const locationChanged =
    (body.city !== undefined && body.city !== current.city) ||
    (body.region !== undefined && body.region !== current.region) ||
    (body.country !== undefined && body.country !== current.country);

  let coords: { lat: number; lng: number } | null | undefined = undefined;
  if (locationChanged) {
    const city = body.city ?? current.city;
    const region = body.region ?? current.region;
    const country = body.country ?? current.country ?? "US";
    if (city && country) coords = await geocode(city, region, country);
    else coords = null;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({
      ...(body.displayName !== undefined && {
        displayName: body.displayName ?? current.displayName,
      }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.region !== undefined && { region: body.region }),
      ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
      ...(body.country !== undefined && {
        country: body.country ?? "US",
      }),
      ...(coords !== undefined && {
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      }),
    })
    .where(eq(userProfilesTable.id, userId))
    .returning();

  return res.json(shapeMine(updated));
});

router.patch("/profiles/me/screenname", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = ChangeScreennameBody.parse(req.body);

  const reason = validateScreenname(body.screenname);
  if (reason) return res.status(400).json({ error: reason });

  const [current] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!current) return res.status(404).json({ error: "Profile not found" });

  if (current.screennameChangedAt) {
    const elapsed = Date.now() - current.screennameChangedAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const daysRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 86400000);
      return res.status(400).json({
        error: "Screenname change cooldown active",
        daysRemaining,
      });
    }
  }

  if (body.screenname.toLowerCase() === (current.screenname ?? "").toLowerCase()) {
    return res.status(400).json({ error: "Same as current screenname" });
  }

  const [taken] = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(
      and(
        sql`lower(${userProfilesTable.screenname}) = ${body.screenname.toLowerCase()}`,
        ne(userProfilesTable.id, userId),
      ),
    )
    .limit(1);
  if (taken) return res.status(409).json({ error: "Screenname taken" });

  const now = new Date();
  let updated;
  try {
    [updated] = await db
      .update(userProfilesTable)
      .set({
        screenname: body.screenname,
        formerScreenname: current.screenname,
        formerScreennameChangedAt: now,
        screennameChangedAt: now,
      })
      .where(eq(userProfilesTable.id, userId))
      .returning();
  } catch (err) {
    if (isUniqueViolation(err))
      return res.status(409).json({ error: "Screenname taken" });
    throw err;
  }

  return res.json(shapeMine(updated));
});

router.get("/profiles/:screenname", requireAuth, async (req, res) => {
  const screenname = String(req.params.screenname ?? "");
  if (!screenname) return res.status(404).json({ error: "Profile not found" });
  const [p] = await db
    .select()
    .from(userProfilesTable)
    .where(
      sql`lower(${userProfilesTable.screenname}) = ${screenname.toLowerCase()}`,
    )
    .limit(1);
  if (!p || !p.screenname)
    return res.status(404).json({ error: "Profile not found" });

  // Vault aggregates
  const [vaultAgg] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${collectionItemsTable.currentValue}), 0)::text`,
      categories: sql<string[]>`array_agg(distinct ${collectionItemsTable.category})`,
    })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, p.id));

  const featuredVaultRows = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, p.id))
    .orderBy(
      desc(collectionItemsTable.favorite),
      desc(collectionItemsTable.createdAt),
    )
    .limit(3);

  const grailRows = await db
    .select()
    .from(grailItemsTable)
    .where(eq(grailItemsTable.userId, p.id))
    .orderBy(desc(grailItemsTable.createdAt))
    .limit(5);

  const postsAgg = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(forumPostsTable)
    .where(eq(forumPostsTable.userId, p.id));

  const recentPosts = await db
    .select({
      id: forumPostsTable.id,
      title: forumPostsTable.title,
      category: forumPostsTable.category,
      createdAt: forumPostsTable.createdAt,
      score: sql<number>`coalesce((select sum(${forumVotesTable.value}) from ${forumVotesTable} where ${forumVotesTable.postId} = ${forumPostsTable.id}), 0)::int`,
      commentCount: sql<number>`coalesce((select count(*) from ${forumRepliesTable} where ${forumRepliesTable.postId} = ${forumPostsTable.id}), 0)::int`,
    })
    .from(forumPostsTable)
    .where(eq(forumPostsTable.userId, p.id))
    .orderBy(desc(forumPostsTable.createdAt))
    .limit(5);

  // Trade reputation aggregates
  const [tradeAgg] = await db
    .select({
      avg: sql<string>`coalesce(avg(${tradeReviewsTable.rating}), 0)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(tradeReviewsTable)
    .where(eq(tradeReviewsTable.reviewedUserId, p.id));

  const [tradesCompletedAgg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tradePostsTable)
    .where(
      and(
        eq(tradePostsTable.status, "completed"),
        sql`(${tradePostsTable.userId} = ${p.id} OR ${tradePostsTable.requesterId} = ${p.id})`,
      ),
    );

  const recentReviewRows = await db
    .select()
    .from(tradeReviewsTable)
    .where(eq(tradeReviewsTable.reviewedUserId, p.id))
    .orderBy(desc(tradeReviewsTable.createdAt))
    .limit(3);

  const reviewerIds = Array.from(
    new Set(recentReviewRows.map((r) => r.reviewerId)),
  );
  const reviewerProfiles =
    reviewerIds.length > 0
      ? await db
          .select({
            id: userProfilesTable.id,
            screenname: userProfilesTable.screenname,
            displayName: userProfilesTable.displayName,
          })
          .from(userProfilesTable)
          .where(inArray(userProfilesTable.id, reviewerIds))
      : [];
  const reviewerMap = new Map(reviewerProfiles.map((rp) => [rp.id, rp]));

  const formerVisible =
    p.formerScreenname &&
    p.formerScreennameChangedAt &&
    Date.now() - p.formerScreennameChangedAt.getTime() <
      FORMER_NAME_VISIBLE_MS;

  const categories = (vaultAgg?.categories ?? [])
    .filter((c): c is string => Boolean(c))
    .slice(0, 6);

  return res.json({
    id: p.id,
    screenname: p.screenname,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    city: p.city,
    region: p.region,
    postalCode: p.postalCode,
    country: p.country ?? "US",
    memberSinceYear: p.createdAt.getUTCFullYear(),
    formerScreenname: formerVisible ? p.formerScreenname : null,
    vaultItemCount: Number(vaultAgg?.count ?? 0),
    estimatedVaultValue: String(vaultAgg?.total ?? "0"),
    tradesCompleted: Number(tradesCompletedAgg?.count ?? 0),
    tradeRepScore: Number(tradeAgg?.avg ?? 0),
    communityPostCount: Number(postsAgg[0]?.count ?? 0),
    categories,
    featuredVaultItems: featuredVaultRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      imageUrl: r.photos?.[0] ?? null,
      condition: r.condition,
      currentValue: r.currentValue,
    })),
    grailList: grailRows.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      targetPrice: g.targetPrice,
      acquired: g.acquired,
    })),
    recentPosts: recentPosts.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category ?? "general",
      score: Number(r.score),
      commentCount: Number(r.commentCount),
      createdAt: r.createdAt.toISOString(),
    })),
    recentTradeReviews: recentReviewRows.map((r) => {
      const reviewer = reviewerMap.get(r.reviewerId);
      return {
        reviewer: reviewer?.screenname ?? reviewer?.displayName ?? "collector",
        stars: r.rating,
        quote: r.comment,
        createdAt: r.createdAt.toISOString(),
      };
    }),
  });
});

export default router;
