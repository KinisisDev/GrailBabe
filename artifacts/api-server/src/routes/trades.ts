import { Router, type IRouter } from "express";
import { db, tradePostsTable, activityEventsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  ListTradesQueryParams,
  ListTradesResponse,
  CreateTradeBody,
  GetTradeParams,
  GetTradeResponse,
  DeleteTradeParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";

const router: IRouter = Router();

function serialize(
  row: typeof tradePostsTable.$inferSelect,
  user: { displayName: string; avatarUrl: string | null },
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
    status: row.status as "open" | "pending" | "closed",
    createdAt: row.createdAt,
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
            displayName: "Collector",
            avatarUrl: null,
          },
        ),
      ),
    ),
  );
});

router.post("/trades", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateTradeBody.parse(req.body);
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
    })
    .returning();
  await db.insert(activityEventsTable).values({
    userId,
    kind: "trade_post",
    message: `Posted trade: "${row.title}"`,
  });
  const userMap = await fetchPublicUsers([userId]);
  res
    .status(201)
    .json(
      serialize(
        row,
        userMap.get(userId) ?? { displayName: "Collector", avatarUrl: null },
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

export default router;
