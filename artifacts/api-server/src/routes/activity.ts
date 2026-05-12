import { Router, type IRouter } from "express";
import { db, activityEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetActivityResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/activity", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.userId, userId))
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(50);
  return res.json(
    GetActivityResponse.parse(
      rows.map((a) => ({
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
    ),
  );
});

export default router;
