import { Router, type IRouter } from "express";
import {
  db,
  collectionItemsTable,
  priceSnapshotsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  GetPortfolioSummaryResponse,
  GetPortfolioByCategoryResponse,
  GetPortfolioTimelineQueryParams,
  GetPortfolioTimelineResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

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

async function buildSummary(userId: string) {
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
    categoryTotals.set(
      i.category,
      (categoryTotals.get(i.category) ?? 0) + v,
    );
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

  return {
    totalValue,
    totalCost,
    gain,
    gainPct,
    itemCount: items.length,
    topCategory,
    bestPerformer: best ? serializeItem(best.row) : undefined,
    worstPerformer: worst ? serializeItem(worst.row) : undefined,
  };
}

router.get("/portfolio/summary", requireAuth, async (req, res) => {
  const summary = await buildSummary(req.userId!);
  return res.json(GetPortfolioSummaryResponse.parse(summary));
});

router.get("/portfolio/by-category", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select({
      category: collectionItemsTable.category,
      itemCount: sql<number>`count(*)::int`,
      value: sql<string>`coalesce(sum(${collectionItemsTable.currentValue}), 0)`,
      costBasis: sql<string>`coalesce(sum(${collectionItemsTable.purchasePrice}), 0)`,
    })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId))
    .groupBy(collectionItemsTable.category);
  return res.json(
    GetPortfolioByCategoryResponse.parse(
      rows.map((r) => ({
        category: r.category,
        itemCount: Number(r.itemCount),
        value: Number(r.value),
        costBasis: Number(r.costBasis),
      })),
    ),
  );
});

router.get("/portfolio/timeline", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const q = GetPortfolioTimelineQueryParams.parse(req.query);
  const range = q.range ?? "30d";
  const days =
    range === "7d"
      ? 7
      : range === "30d"
        ? 30
        : range === "90d"
          ? 90
          : range === "1y"
            ? 365
            : 1825;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await db
    .select({ id: collectionItemsTable.id })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));
  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) {
    return res.json(GetPortfolioTimelineResponse.parse([]));
  }
  const snapshots = await db
    .select()
    .from(priceSnapshotsTable)
    .where(
      and(
        inArray(priceSnapshotsTable.itemId, itemIds),
        gte(priceSnapshotsTable.recordedAt, since),
      ),
    )
    .orderBy(asc(priceSnapshotsTable.recordedAt));

  // Aggregate by day: latest price per item per day, summed.
  const dayMap = new Map<string, Map<number, number>>();
  for (const s of snapshots) {
    const day = s.recordedAt.toISOString().slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, new Map());
    dayMap.get(day)!.set(s.itemId, Number(s.price));
  }
  const lastPriceByItem = new Map<number, number>();
  const sortedDays = [...dayMap.keys()].sort();
  const result: { date: Date; value: number }[] = [];
  for (const day of sortedDays) {
    const updates = dayMap.get(day)!;
    for (const [id, price] of updates) lastPriceByItem.set(id, price);
    let total = 0;
    for (const v of lastPriceByItem.values()) total += v;
    result.push({ date: new Date(day + "T00:00:00.000Z"), value: total });
  }
  return res.json(GetPortfolioTimelineResponse.parse(result));
});

export default router;

void desc;
