import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  RemoveBackgroundBody,
  ScannerAnalyzeBody,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { cachedJson } from "../lib/externalFetch";

const router: IRouter = Router();

const REMOVE_BG_TIMEOUT_MS = 10_000;
const PRICE_FETCH_TIMEOUT_MS = 8_000;
const AI_GRADE_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function imageTooLarge(b64: string): boolean {
  const { base64 } = stripDataUrl(b64);
  // base64 length * 3/4 ≈ decoded byte size
  return Math.floor(base64.length * 0.75) > MAX_IMAGE_BYTES;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function stripDataUrl(input: string): {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
} {
  const m = input.match(/^data:(image\/[a-z+]+);base64,(.*)$/i);
  if (!m) {
    return { base64: input, mediaType: "image/jpeg" };
  }
  const mt = m[1]!.toLowerCase();
  const allowed: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
  };
  return { base64: m[2]!, mediaType: allowed[mt] ?? "image/jpeg" };
}

router.post("/scanner/remove-background", requireAuth, async (req, res) => {
  const parsed = RemoveBackgroundBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid request body" });
  if (imageTooLarge(parsed.data.imageBase64))
    return res
      .status(413)
      .json({ error: "Image exceeds 10MB limit" });
  const apiKey = process.env.BGREMOVE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "Background removal not configured (BGREMOVE_API_KEY missing). Returning original image.",
    });
  }

  const { base64 } = stripDataUrl(parsed.data.imageBase64);
  const buf = Buffer.from(base64, "base64");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REMOVE_BG_TIMEOUT_MS);
  try {
    // remove.bg-compatible API contract.
    const form = new FormData();
    form.append(
      "image_file",
      new Blob([buf], { type: "image/png" }),
      "image.png",
    );
    form.append("size", "auto");
    form.append("format", "png");

    const upstream = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
      signal: ctrl.signal,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      req.log.warn(
        { status: upstream.status, detail: detail.slice(0, 200) },
        "Background removal upstream error",
      );
      return res
        .status(502)
        .json({ error: `Background removal failed (${upstream.status})` });
    }

    const arr = new Uint8Array(await upstream.arrayBuffer());
    const out = Buffer.from(arr).toString("base64");
    return res.json({ imageBase64: `data:image/png;base64,${out}` });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      return res
        .status(408)
        .json({ error: "Background removal timed out after 10s" });
    }
    req.log.error({ err }, "Background removal threw");
    return res.status(502).json({ error: "Background removal failed" });
  } finally {
    clearTimeout(timer);
  }
});

interface PriceData {
  low: number;
  mid: number;
  high: number;
  recentSoldCount: number;
  sources: string[];
  set?: string | null;
  year?: number | null;
  resolvedName?: string;
  isMockData: boolean;
  extendedPrices: Array<{ label: string; value: string; note?: string | null }>;
}

function deterministicSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function mockPrices(seed: string, base: number): { low: number; mid: number; high: number } {
  const h = deterministicSeed(seed);
  const mid = base + (h % 1500) / 10;
  const low = mid * 0.7;
  const high = mid * 1.6;
  return {
    low: Math.round(low * 100) / 100,
    mid: Math.round(mid * 100) / 100,
    high: Math.round(high * 100) / 100,
  };
}

function mockSparkline(seed: string): number[] {
  const h = deterministicSeed(seed);
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const v = 50 + ((h >> (i % 16)) & 0x3f);
    out.push(v);
  }
  return out;
}

interface ScryfallCard {
  name?: string;
  set_name?: string;
  released_at?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
  };
}

async function fetchTcgPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  // Try Scryfall (no auth) for TCG cards by name.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PRICE_FETCH_TIMEOUT_MS);
  try {
    const result = await cachedJson<ScryfallCard>(
      `scanner:scryfall:${itemId.toLowerCase()}`,
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(itemId)}`,
      {
        headers: {
          "User-Agent": process.env.SCRYFALL_USER_AGENT || "GrailBabe/1.0",
          Accept: "application/json",
        },
        signal: ctrl.signal,
      },
    );
    const data = result.data;
    const usd = Number(data.prices?.usd ?? 0);
    const foil = Number(data.prices?.usd_foil ?? 0);
    if (usd > 0) {
      const mid = usd;
      const low = Math.round(mid * 0.75 * 100) / 100;
      const high = Math.round(mid * 1.5 * 100) / 100;
      const extended: PriceData["extendedPrices"] = [];
      if (advanced) {
        if (foil > 0)
          extended.push({
            label: "Foil / Holo",
            value: `$${foil.toFixed(2)}`,
            note: "Scryfall market",
          });
        extended.push({
          label: "PSA 9 estimate",
          value: `$${(mid * 3).toFixed(2)}`,
          note: "Typical 3× raw multiplier",
        });
        extended.push({
          label: "PSA 10 estimate",
          value: `$${(mid * 8).toFixed(2)}`,
          note: "Typical 8× raw multiplier",
        });
      }
      return {
        low,
        mid,
        high,
        recentSoldCount: 0,
        sources: ["Scryfall"],
        set: data.set_name ?? null,
        year: data.released_at
          ? Number(data.released_at.slice(0, 4)) || null
          : null,
        resolvedName: data.name ?? itemId,
        isMockData: false,
        extendedPrices: extended,
      };
    }
  } catch {
    // fall through to mock
  } finally {
    clearTimeout(timer);
  }

  // Mock fallback
  const p = mockPrices(itemId + ":tcg", 12);
  return {
    ...p,
    recentSoldCount: 27,
    sources: ["Mock data — TCGPlayer key not configured"],
    set: null,
    year: null,
    resolvedName: itemId,
    isMockData: true,
    extendedPrices: advanced
      ? [
          { label: "Foil / Holo", value: `$${(p.mid * 1.4).toFixed(2)}`, note: "Mock" },
          { label: "PSA 9 estimate", value: `$${(p.mid * 3).toFixed(2)}`, note: "Mock" },
          { label: "PSA 10 estimate", value: `$${(p.mid * 8).toFixed(2)}`, note: "Mock" },
        ]
      : [],
  };
}

async function fetchSportsPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  // eBay sold-listings would require Marketing/Browse API. We won't shoehorn here;
  // attempt only if creds exist, otherwise mock.
  const haveEbay = Boolean(process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID);
  const p = mockPrices(itemId + ":sports", 25);
  const sources: string[] = haveEbay
    ? [
        "Mock data — eBay sold-listing aggregation not yet implemented",
      ]
    : ["Mock data — eBay key not configured"];
  return {
    ...p,
    recentSoldCount: 14,
    sources,
    set: null,
    year: null,
    resolvedName: itemId,
    isMockData: true,
    extendedPrices: advanced
      ? [
          { label: "Rookie premium", value: `$${(p.mid * 2).toFixed(2)}`, note: "Mock" },
          { label: "Raw vs PSA 10 spread", value: `$${(p.mid * 6).toFixed(2)}`, note: "Mock" },
        ]
      : [],
  };
}

interface RebrickableSet {
  set_num?: string;
  name?: string;
  year?: number;
  num_parts?: number;
}

async function fetchLegoPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  const key = process.env.REBRICKABLE_API_KEY;
  if (key) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PRICE_FETCH_TIMEOUT_MS);
    try {
      const result = await cachedJson<RebrickableSet>(
        `scanner:rebrickable:set:${itemId}`,
        `https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(itemId)}/`,
        { headers: { Authorization: `key ${key}` }, signal: ctrl.signal },
      );
      const data = result.data;
      // Rebrickable doesn't give pricing — heuristic from part count.
      const parts = data.num_parts ?? 100;
      const mid = Math.round(parts * 0.12 * 100) / 100;
      const low = Math.round(mid * 0.7 * 100) / 100;
      const high = Math.round(mid * 1.8 * 100) / 100;
      return {
        low,
        mid,
        high,
        recentSoldCount: 0,
        sources: ["Rebrickable", "Mock data — BrickLink key not configured"],
        set: data.set_num ?? null,
        year: data.year ?? null,
        resolvedName: data.name ?? itemId,
        isMockData: true,
        extendedPrices: advanced
          ? [
              { label: "Sealed (MISB)", value: `$${(mid * 1.4).toFixed(2)}`, note: "Mock" },
              { label: "Opened complete", value: `$${(mid * 0.7).toFixed(2)}`, note: "Mock" },
              { label: "Retired premium", value: `$${(mid * 2.2).toFixed(2)}`, note: "Mock" },
            ]
          : [],
      };
    } catch {
      // fall through
    } finally {
      clearTimeout(timer);
    }
  }

  const p = mockPrices(itemId + ":lego", 60);
  return {
    ...p,
    recentSoldCount: 9,
    sources: ["Mock data — Rebrickable/BrickLink keys not configured"],
    set: itemId,
    year: null,
    resolvedName: `LEGO Set ${itemId}`,
    isMockData: true,
    extendedPrices: advanced
      ? [
          { label: "Sealed (MISB)", value: `$${(p.mid * 1.4).toFixed(2)}`, note: "Mock" },
          { label: "Opened complete", value: `$${(p.mid * 0.7).toFixed(2)}`, note: "Mock" },
          { label: "Retired premium", value: `$${(p.mid * 2.2).toFixed(2)}`, note: "Mock" },
        ]
      : [],
  };
}

interface AiGradeOutput {
  grade: string;
  gradeRange: string;
  defects: string[];
  centering: string;
  surfaceNotes: string;
  authenticityOk: boolean;
  authenticityFlags: string[];
}

async function gradeWithAi(
  imageBase64: string,
  category: "tcg" | "sports" | "lego",
): Promise<AiGradeOutput> {
  const { base64, mediaType } = stripDataUrl(imageBase64);
  const systemPrompt =
    "You are an expert collectibles grader. Analyze this card/item image and provide concise, precise output as STRICT minified JSON only with this shape: " +
    `{"grade":"PSA 7","gradeRange":"PSA 7-8","defects":["..."],"centering":"55/45 L-R, 50/50 T-B","surfaceNotes":"...","authenticityOk":true,"authenticityFlags":["..."]}. ` +
    "For LEGO, replace grade with a Used/New estimate but keep the same JSON shape. No markdown, no commentary.";

  const userInstruction =
    category === "lego"
      ? "Estimate completeness and condition (sealed, complete used, missing parts). List visible defects, color/sticker condition, and any authenticity flags."
      : "Provide PSA 1-10 grade with brief reasoning, visible defects (creases, scratches, stains, print defects), centering estimate (left/right and top/bottom percentages), surface condition notes, and authenticity flags if anything looks off.";

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: userInstruction },
        ],
      },
    ],
  });

  const text = msg.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n")
    .trim();

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as AiGradeOutput;
  return {
    grade: String(parsed.grade ?? ""),
    gradeRange: String(parsed.gradeRange ?? parsed.grade ?? ""),
    defects: Array.isArray(parsed.defects) ? parsed.defects.map(String) : [],
    centering: String(parsed.centering ?? ""),
    surfaceNotes: String(parsed.surfaceNotes ?? ""),
    authenticityOk: Boolean(parsed.authenticityOk ?? true),
    authenticityFlags: Array.isArray(parsed.authenticityFlags)
      ? parsed.authenticityFlags.map(String)
      : [],
  };
}

router.post("/scanner/analyze", requireAuth, async (req, res) => {
  const parsed = ScannerAnalyzeBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid request body" });
  const { itemId, category, imageBase64, mode } = parsed.data;
  const advanced = mode === "advanced";
  if (imageBase64 && imageTooLarge(imageBase64))
    return res
      .status(413)
      .json({ error: "Image exceeds 10MB limit" });

  let priceData: PriceData;
  try {
    if (category === "tcg") priceData = await fetchTcgPrice(itemId, advanced);
    else if (category === "sports")
      priceData = await fetchSportsPrice(itemId, advanced);
    else priceData = await fetchLegoPrice(itemId, advanced);
  } catch (err) {
    req.log.error({ err }, "Scanner price fetch failed");
    return res.status(502).json({ error: "Failed to fetch price data" });
  }

  let ai: AiGradeOutput | null = null;
  let aiError = false;
  let aiErrorReason: string | null = null;
  if (advanced && imageBase64) {
    try {
      ai = await withTimeout(
        gradeWithAi(imageBase64, category),
        AI_GRADE_TIMEOUT_MS,
        "AI grading",
      );
    } catch (err) {
      aiError = true;
      aiErrorReason =
        err instanceof Error ? err.message.slice(0, 200) : "Unknown AI error";
      req.log.warn({ err }, "AI grading failed");
    }
  }

  const sparkline = advanced
    ? mockSparkline(itemId + ":" + category)
    : [];

  return res.json({
    name: priceData.resolvedName ?? itemId,
    set: priceData.set ?? null,
    year: priceData.year ?? null,
    priceRange: {
      low: priceData.low,
      mid: priceData.mid,
      high: priceData.high,
    },
    recentSoldCount: priceData.recentSoldCount,
    sources: priceData.sources,
    isMockData: priceData.isMockData,
    aiGrade: ai?.grade ?? null,
    aiGradeRange: ai?.gradeRange ?? null,
    defects: ai?.defects ?? [],
    centering: ai?.centering ?? null,
    surfaceNotes: ai?.surfaceNotes ?? null,
    authenticityFlags: ai?.authenticityFlags ?? [],
    authenticityOk: ai?.authenticityOk ?? null,
    extendedPrices: priceData.extendedPrices,
    priceHistorySparkline: sparkline,
    aiError,
    aiErrorReason,
  });
});

export default router;
