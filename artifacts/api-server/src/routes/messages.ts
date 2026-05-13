import { Router, type IRouter } from "express";
import {
  db,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  GetOrCreateConversationBody,
  SendMessageBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { fetchPublicUsers } from "../lib/users";

const router: IRouter = Router();

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.participantA, userId),
        eq(conversationsTable.participantB, userId),
      ),
    )
    .orderBy(desc(conversationsTable.updatedAt));

  if (rows.length === 0) return res.json([]);

  const otherIds = rows.map((c) =>
    c.participantA === userId ? c.participantB : c.participantA,
  );
  const userMap = await fetchPublicUsers(otherIds);

  const lastMsgs = await Promise.all(
    rows.map(async (c) => {
      const [m] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, c.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);
      return [c.id, m] as const;
    }),
  );
  const lastMap = new Map(lastMsgs);

  const unreadRows = await db
    .select({
      conversationId: messagesTable.conversationId,
      count: sql<number>`count(*)::int`,
    })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.read, false),
        ne(messagesTable.senderId, userId),
      ),
    )
    .groupBy(messagesTable.conversationId);
  const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, r.count]));

  return res.json(
    rows.map((c) => {
      const otherId = c.participantA === userId ? c.participantB : c.participantA;
      const u = userMap.get(otherId) ?? {
        id: otherId,
        displayName: "Collector",
        avatarUrl: null,
      };
      const last = lastMap.get(c.id) ?? null;
      return {
        id: c.id,
        otherUser: u,
        lastMessage: last
          ? {
              id: last.id,
              conversationId: last.conversationId,
              senderId: last.senderId,
              content: last.content,
              read: last.read,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unreadCount: unreadMap.get(c.id) ?? 0,
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
  );
});

router.post("/conversations", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = GetOrCreateConversationBody.parse(req.body);
  if (body.otherUserId === userId) {
    return res.status(400).json({ error: "Cannot message yourself" });
  }

  const [pa, pb] = pair(userId, body.otherUserId);

  // Atomic get-or-create: insert with ON CONFLICT DO NOTHING, then re-select.
  // Avoids race where two concurrent requests both miss the SELECT.
  await db
    .insert(conversationsTable)
    .values({ participantA: pa, participantB: pb })
    .onConflictDoNothing();

  const [convo] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.participantA, pa),
        eq(conversationsTable.participantB, pb),
      ),
    )
    .limit(1);
  if (!convo) {
    return res.status(500).json({ error: "Conversation lookup failed" });
  }

  const userMap = await fetchPublicUsers([body.otherUserId]);
  const u = userMap.get(body.otherUserId) ?? {
    id: body.otherUserId,
    displayName: "Collector",
    avatarUrl: null,
  };

  return res.json({
    id: convo.id,
    otherUser: u,
    lastMessage: null,
    unreadCount: 0,
    updatedAt: convo.updatedAt.toISOString(),
  });
});

async function assertParticipant(convoId: number, userId: string) {
  const [c] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convoId))
    .limit(1);
  if (!c) return null;
  if (c.participantA !== userId && c.participantB !== userId) return null;
  return c;
}

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number.parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
  const c = await assertParticipant(id, userId);
  if (!c) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  return res.json(
    rows.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      read: m.read,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number.parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
  const c = await assertParticipant(id, userId);
  if (!c) return res.status(404).json({ error: "Not found" });

  const body = SendMessageBody.parse(req.body);
  const [row] = await db
    .insert(messagesTable)
    .values({ conversationId: id, senderId: userId, content: body.content })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, id));

  return res.status(201).json({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: row.content,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  });
});

router.post("/conversations/:id/read", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = Number.parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
  const c = await assertParticipant(id, userId);
  if (!c) return res.status(404).json({ error: "Not found" });

  await db
    .update(messagesTable)
    .set({ read: true })
    .where(
      and(
        eq(messagesTable.conversationId, id),
        ne(messagesTable.senderId, userId),
        eq(messagesTable.read, false),
      ),
    );
  return res.status(204).send();
});

router.get("/messages/unread-count", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const myConvos = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.participantA, userId),
        eq(conversationsTable.participantB, userId),
      ),
    );
  if (myConvos.length === 0) return res.json({ count: 0 });
  const ids = myConvos.map((c) => c.id);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.read, false),
        ne(messagesTable.senderId, userId),
        sql`${messagesTable.conversationId} = ANY(${ids})`,
      ),
    );
  return res.json({ count: Number(row?.count ?? 0) });
});

export default router;
