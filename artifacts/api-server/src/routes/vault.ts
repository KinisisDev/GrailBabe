import { Router, type IRouter } from "express";
import {
  db,
  collectionItemsTable,
  priceSnapshotsTable,
  activityEventsTable,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  ListVaultItemsQueryParams,
  ListVaultItemsResponse,
  CreateVaultItemBody,
  GetVaultItemParams,
  GetVaultItemResponse,
  UpdateVaultItemParams,
  UpdateVaultItemBody,
  UpdateVaultItemResponse,
  DeleteVaultItemParams,
  GetVaultItemPricesParams,
  GetVaultItemPricesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getProfileWithCounts, limitsFor, toTier } from "../lib/profile";

const router: IRouter = Router();

function serialize(row: typeof collectionItemsTable.$inferSelect) {
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

router.get("/vault", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const q = ListVaultItemsQueryParams.parse(req.query);
  const filters = [eq(collectionItemsTable.userId, userId)];
  if (q.category) filters.push(eq(collectionItemsTable.category, q.category));
  if (q.condition)
    filters.push(eq(collectionItemsTable.condition, q.condition));
  if (q.search)
    filters.push(
      or(
        ilike(collectionItemsTable.name, `%${q.search}%`),
        ilike(collectionItemsTable.brand, `%${q.search}%`),
      )!,
    );

  const sortKey =
    q.sort === "value"
      ? desc(collectionItemsTable.currentValue)
      : q.sort === "name"
        ? asc(collectionItemsTable.name)
        : desc(collectionItemsTable.createdAt);

  const rows = await db
    .select()
    .from(collectionItemsTable)
    .where(and(...filters))
    .orderBy(sortKey);
  return res.json(ListVaultItemsResponse.parse(rows.map(serialize)));
});

router.post("/vault", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateVaultItemBody.parse(req.body);

  const data = await getProfileWithCounts(userId);
  if (data) {
    const limits = limitsFor(toTier(data.profile.tier));
    if (limits.vaultMax !== null && data.vaultCount >= limits.vaultMax) {
      return res.status(402).json({
        error: "Free tier vault limit reached",
        code: "tier_limit",
        limit: limits.vaultMax,
      });
    }
  }

  const [row] = await db
    .insert(collectionItemsTable)
    .values({
      userId,
      name: body.name,
      brand: body.brand,
      category: body.category,
      condition: body.condition,
      purchasePrice: body.purchasePrice?.toString(),
      currentValue: body.currentValue?.toString(),
      purchaseDate: body.purchaseDate
        ? body.purchaseDate.toISOString().slice(0, 10)
        : undefined,
      notes: body.notes,
      photos: body.photos ?? [],
      tags: body.tags ?? [],
      sku: body.sku,
      favorite: body.favorite ?? false,
    })
    .returning();

  if (body.currentValue !== undefined) {
    await db.insert(priceSnapshotsTable).values({
      itemId: row.id,
      price: body.currentValue.toString(),
      source: "manual",
    });
  }

  await db.insert(activityEventsTable).values({
    userId,
    kind: "vault_add",
    message: `Added "${row.name}" to your vault`,
    itemId: row.id,
  });

  return res.status(201).json(serialize(row));
});

router.get("/vault/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = GetVaultItemParams.parse(req.params);
  const [row] = await db
    .select()
    .from(collectionItemsTable)
    .where(
      and(
        eq(collectionItemsTable.id, id),
        eq(collectionItemsTable.userId, userId),
      ),
    )
    .limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  const prices = await db
    .select()
    .from(priceSnapshotsTable)
    .where(eq(priceSnapshotsTable.itemId, id))
    .orderBy(desc(priceSnapshotsTable.recordedAt));
  return res.json(
    GetVaultItemResponse.parse({
      item: serialize(row),
      priceHistory: prices.map((p) => ({
        id: p.id,
        price: Number(p.price),
        source: p.source,
        recordedAt: p.recordedAt,
      })),
    }),
  );
});

router.patch("/vault/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = UpdateVaultItemParams.parse(req.params);
  const body = UpdateVaultItemBody.parse(req.body);
  const [updated] = await db
    .update(collectionItemsTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.brand !== undefined && { brand: body.brand }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.condition !== undefined && { condition: body.condition }),
      ...(body.purchasePrice !== undefined && {
        purchasePrice: body.purchasePrice.toString(),
      }),
      ...(body.currentValue !== undefined && {
        currentValue: body.currentValue.toString(),
      }),
      ...(body.purchaseDate !== undefined && {
        purchaseDate: body.purchaseDate.toISOString().slice(0, 10),
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.photos !== undefined && { photos: body.photos }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.sku !== undefined && { sku: body.sku }),
      ...(body.favorite !== undefined && { favorite: body.favorite }),
    })
    .where(
      and(
        eq(collectionItemsTable.id, id),
        eq(collectionItemsTable.userId, userId),
      ),
    )
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  if (body.currentValue !== undefined) {
    await db.insert(priceSnapshotsTable).values({
      itemId: id,
      price: body.currentValue.toString(),
      source: "manual",
    });
    await db.insert(activityEventsTable).values({
      userId,
      kind: "price_change",
      message: `Updated value of "${updated.name}"`,
      itemId: id,
    });
  } else {
    await db.insert(activityEventsTable).values({
      userId,
      kind: "vault_update",
      message: `Updated "${updated.name}"`,
      itemId: id,
    });
  }

  return res.json(UpdateVaultItemResponse.parse(serialize(updated)));
});

router.delete("/vault/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = DeleteVaultItemParams.parse(req.params);
  const result = await db
    .delete(collectionItemsTable)
    .where(
      and(
        eq(collectionItemsTable.id, id),
        eq(collectionItemsTable.userId, userId),
      ),
    )
    .returning({ id: collectionItemsTable.id });
  if (result.length === 0) return res.status(404).json({ error: "Not found" });
  await db
    .delete(priceSnapshotsTable)
    .where(eq(priceSnapshotsTable.itemId, id));
  return res.status(204).end();
});

router.get("/vault/:id/prices", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = GetVaultItemPricesParams.parse(req.params);
  const [item] = await db
    .select({ id: collectionItemsTable.id })
    .from(collectionItemsTable)
    .where(
      and(
        eq(collectionItemsTable.id, id),
        eq(collectionItemsTable.userId, userId),
      ),
    )
    .limit(1);
  if (!item) return res.status(404).json({ error: "Not found" });
  const rows = await db
    .select()
    .from(priceSnapshotsTable)
    .where(eq(priceSnapshotsTable.itemId, id))
    .orderBy(asc(priceSnapshotsTable.recordedAt));
  return res.json(
    GetVaultItemPricesResponse.parse(
      rows.map((p) => ({
        id: p.id,
        price: Number(p.price),
        source: p.source,
        recordedAt: p.recordedAt,
      })),
    ),
  );
});

export default router;

// Suppress unused warnings for sql import (kept for future analytics use)
void sql;
