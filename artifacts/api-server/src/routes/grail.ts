import { Router, type IRouter } from "express";
import { db, grailItemsTable, activityEventsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  ListGrailsResponse,
  CreateGrailBody,
  UpdateGrailParams,
  UpdateGrailBody,
  UpdateGrailResponse,
  DeleteGrailParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getProfileWithCounts, limitsFor, toTier } from "../lib/profile";

const router: IRouter = Router();

function serialize(row: typeof grailItemsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetPrice: row.targetPrice ? Number(row.targetPrice) : null,
    notes: row.notes,
    imageUrl: row.imageUrl,
    priority: row.priority as "low" | "medium" | "high",
    acquired: row.acquired,
    createdAt: row.createdAt,
  };
}

router.get("/grail", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(grailItemsTable)
    .where(eq(grailItemsTable.userId, userId))
    .orderBy(desc(grailItemsTable.createdAt));
  return res.json(ListGrailsResponse.parse(rows.map(serialize)));
});

router.post("/grail", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateGrailBody.parse(req.body);
  const data = await getProfileWithCounts(userId);
  if (data) {
    const limits = limitsFor(toTier(data.profile.tier));
    if (limits.grailMax !== null && data.grailCount >= limits.grailMax) {
      return res.status(402).json({
        error: "Free tier grail limit reached",
        code: "tier_limit",
        limit: limits.grailMax,
      });
    }
  }

  const [row] = await db
    .insert(grailItemsTable)
    .values({
      userId,
      name: body.name,
      category: body.category,
      targetPrice: body.targetPrice?.toString(),
      notes: body.notes,
      imageUrl: body.imageUrl,
      priority: body.priority ?? "medium",
    })
    .returning();
  await db.insert(activityEventsTable).values({
    userId,
    kind: "grail_add",
    message: `Added "${row.name}" to your grail list`,
  });
  return res.status(201).json(serialize(row));
});

router.patch("/grail/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = UpdateGrailParams.parse(req.params);
  const body = UpdateGrailBody.parse(req.body);
  const [updated] = await db
    .update(grailItemsTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.targetPrice !== undefined && {
        targetPrice: body.targetPrice.toString(),
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.acquired !== undefined && { acquired: body.acquired }),
    })
    .where(and(eq(grailItemsTable.id, id), eq(grailItemsTable.userId, userId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  if (body.acquired === true) {
    await db.insert(activityEventsTable).values({
      userId,
      kind: "grail_acquired",
      message: `Acquired grail "${updated.name}"`,
    });
  }
  return res.json(UpdateGrailResponse.parse(serialize(updated)));
});

router.delete("/grail/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { id } = DeleteGrailParams.parse(req.params);
  const result = await db
    .delete(grailItemsTable)
    .where(and(eq(grailItemsTable.id, id), eq(grailItemsTable.userId, userId)))
    .returning({ id: grailItemsTable.id });
  if (result.length === 0) return res.status(404).json({ error: "Not found" });
  return res.status(204).end();
});

export default router;
