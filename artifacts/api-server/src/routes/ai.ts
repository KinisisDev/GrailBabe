import { Router, type IRouter } from "express";
import { db, collectionItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetAiInsightsBody,
  GetAiInsightsResponse,
  AiSearchBody,
  AiSearchResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getProfileWithCounts, limitsFor, toTier } from "../lib/profile";
import { generateJson } from "../lib/anthropic";

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

async function requirePremium(userId: string) {
  const data = await getProfileWithCounts(userId);
  if (!data) return false;
  return limitsFor(toTier(data.profile.tier)).aiEnabled;
}

router.post("/ai/insights", requireAuth, async (req, res) => {
  const userId = req.userId!;
  if (!(await requirePremium(userId))) {
    return res.status(402).json({
      error: "AI insights are a premium feature",
      code: "tier_required",
    });
  }
  const body = GetAiInsightsBody.parse(req.body);
  const focus = body.focus ?? "overview";

  const items = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));
  if (items.length === 0) {
    return res.json(
      GetAiInsightsResponse.parse({
        summary:
          "Your vault is empty. Add a few collectibles to start receiving AI-powered insights about your portfolio.",
        highlights: [],
        generatedAt: new Date(),
      }),
    );
  }

  const itemSummary = items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    category: i.category,
    condition: i.condition,
    purchasePrice: i.purchasePrice ? Number(i.purchasePrice) : null,
    currentValue: i.currentValue ? Number(i.currentValue) : null,
  }));

  const json = await generateJson<{
    summary: string;
    highlights: {
      title: string;
      body: string;
      sentiment: "positive" | "neutral" | "warning";
      itemId?: number | null;
    }[];
  }>({
    system:
      "You are an expert collectibles portfolio analyst. Produce concise, actionable insights for a collector. Be specific. Reference itemId when relevant.",
    prompt: `Analyze this collection with focus: "${focus}". Return JSON with shape: { "summary": string (2-3 sentences), "highlights": [{ "title": string, "body": string (1-2 sentences), "sentiment": "positive"|"neutral"|"warning", "itemId": number|null }] }. Provide 3-5 highlights.\n\nCollection:\n${JSON.stringify(itemSummary)}`,
  });

  const fallback = {
    summary: `You have ${items.length} items in your vault.`,
    highlights: [],
  };
  const data = json ?? fallback;
  return res.json(
    GetAiInsightsResponse.parse({
      summary: data.summary,
      highlights: (data.highlights ?? []).map((h) => ({
        title: h.title,
        body: h.body,
        sentiment: h.sentiment,
        itemId: h.itemId ?? null,
      })),
      generatedAt: new Date(),
    }),
  );
});

router.post("/ai/search", requireAuth, async (req, res) => {
  const userId = req.userId!;
  if (!(await requirePremium(userId))) {
    return res.status(402).json({
      error: "AI search is a premium feature",
      code: "tier_required",
    });
  }
  const body = AiSearchBody.parse(req.body);

  const items = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));

  const compact = items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    category: i.category,
    condition: i.condition,
    currentValue: i.currentValue ? Number(i.currentValue) : null,
  }));

  const json = await generateJson<{
    interpretation: string;
    matchedIds: number[];
  }>({
    system:
      "You match user natural-language queries against a collectibles vault. Return only ids that genuinely match.",
    prompt: `Query: "${body.query}"\nReturn JSON: { "interpretation": string, "matchedIds": number[] }.\n\nVault:\n${JSON.stringify(compact)}`,
  });

  const matchedIds = json?.matchedIds ?? [];
  const matched = items.filter((i) => matchedIds.includes(i.id));
  return res.json(
    AiSearchResponse.parse({
      interpretation:
        json?.interpretation ?? `Showing items matching: ${body.query}`,
      results: matched.map(serializeItem),
    }),
  );
});

export default router;
