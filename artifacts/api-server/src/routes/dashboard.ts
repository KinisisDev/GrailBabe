import { Router, type IRouter } from "express";
import {
  db,
  collectionItemsTable,
  grailItemsTable,
  tradePostsTable,
  activityEventsTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";

const router: IRouter = Router();

function serializeItem(row: typeof collectionItemsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    condition: row.condition as
      | "mint"
      | "near_mint"
      | "excellent"
      | "good"
      | "fair"
      | "poor",
    purchasePrice: row.purchasePrice ? Number(row.purchasePrice) : null,
    currentValue: row.currentValue ? Number(row.currentValue) : null,
    purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
    notes: row.notes,
    photos: row.photos ?? [],
    tags: row.tags ?? [],
    sku: row.sku,
    favorite: row.favorite,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/dashboard", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const items = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));

  let totalValue = 0;
  let totalCost = 0;
  const categoryTotals = new Map<string, number>();
  let best: { row: typeof items[number]; gain: number } | null = null;
  let worst: { row: typeof items[number]; gain: number } | null = null;
  for (const i of items) {
    const v = i.currentValue ? Number(i.currentValue) : 0;
    const c = i.purchasePrice ? Number(i.purchasePrice) : 0;
    totalValue += v;
    totalCost += c;
    categoryTotals.set(i.category, (categoryTotals.get(i.category) ?? 0) + v);
    if (i.purchasePrice && i.currentValue) {
      const gain = v - c;
      if (best === null || gain > best.gain) best = { row: i, gain };
      if (worst === null || gain < worst.gain) worst = { row: i, gain };
    }
  }
  const gain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const topCategory =
    categoryTotals.size === 0
      ? null
      : [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const recentItems = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId))
    .orderBy(desc(collectionItemsTable.createdAt))
    .limit(5);

  const topGrails = await db
    .select()
    .from(grailItemsTable)
    .where(eq(grailItemsTable.userId, userId))
    .orderBy(desc(grailItemsTable.createdAt))
    .limit(5);

  const hotTradesRaw = await db
    .select()
    .from(tradePostsTable)
    .where(eq(tradePostsTable.status, "open"))
    .orderBy(desc(tradePostsTable.createdAt))
    .limit(5);
  const userMap = await fetchPublicUsers(hotTradesRaw.map((t) => t.userId));

  const activity = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.userId, userId))
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(10);

  return res.json(
    GetDashboardResponse.parse({
      portfolio: {
        totalValue,
        totalCost,
        gain,
        gainPct,
        itemCount: items.length,
        topCategory,
        bestPerformer: best ? serializeItem(best.row) : undefined,
        worstPerformer: worst ? serializeItem(worst.row) : undefined,
      },
      recentItems: recentItems.map(serializeItem),
      topGrails: topGrails.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        targetPrice: g.targetPrice ? Number(g.targetPrice) : null,
        notes: g.notes,
        imageUrl: g.imageUrl,
        priority: g.priority as "low" | "medium" | "high",
        acquired: g.acquired,
        createdAt: g.createdAt,
      })),
      hotTrades: hotTradesRaw.map((t) => {
        const u = userMap.get(t.userId) ?? {
          screenname: null,
          displayName: "Collector",
          avatarUrl: null,
        };
        return {
          id: t.id,
          userId: t.userId,
          userName: u.displayName,
          userAvatar: u.avatarUrl,
          title: t.title,
          description: t.description,
          category: t.category,
          condition: t.condition,
          askingPrice: t.askingPrice ? Number(t.askingPrice) : null,
          photos: t.photos ?? [],
          kind: t.kind as "trade" | "sell" | "buy",
          wantedItems: t.wantedItems ?? [],
          status: t.status as "open" | "pending" | "closed",
          createdAt: t.createdAt,
        };
      }),
      activity: activity.map((a) => ({
        id: String(a.id),
        kind: a.kind as
          | "vault_add"
          | "vault_update"
          | "grail_add"
          | "grail_acquired"
          | "trade_post"
          | "price_change"
          | "forum_post",
        message: a.message,
        itemId: a.itemId,
        createdAt: a.createdAt,
      })),
    }),
  );
});

export default router;
