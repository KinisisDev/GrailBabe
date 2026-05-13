import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  RemoveBackgroundBody,
  ScannerAnalyzeBody,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { cacheGet, cacheSet } from "../lib/cache";
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

interface PartialPrice {
  low?: number | null;
  mid: number;
  high?: number | null;
  source: string;
  set?: string | null;
  year?: number | null;
  resolvedName?: string | null;
  extendedPrices?: PriceData["extendedPrices"];
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

function abortableInit(extra: RequestInit = {}): {
  init: RequestInit;
  cancel: () => void;
} {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PRICE_FETCH_TIMEOUT_MS);
  return {
    init: { ...extra, signal: ctrl.signal },
    cancel: () => clearTimeout(timer),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildResult(
  itemId: string,
  primary: PartialPrice,
  extras: PartialPrice[],
  recentSoldCount: number,
  advanced: boolean,
): PriceData {
  const mid = primary.mid;
  const low = primary.low ?? round2(mid * 0.75);
  const high = primary.high ?? round2(mid * 1.5);

  const sources = [primary.source, ...extras.map((e) => e.source)];
  const extendedPrices: PriceData["extendedPrices"] = [];
  if (advanced) {
    for (const e of extras) {
      extendedPrices.push({
        label: e.source,
        value: `$${e.mid.toFixed(2)}`,
        note: e.resolvedName ?? null,
      });
    }
    if (primary.extendedPrices) extendedPrices.push(...primary.extendedPrices);
  }

  return {
    low,
    mid,
    high,
    recentSoldCount,
    sources,
    set: primary.set ?? extras.find((e) => e.set)?.set ?? null,
    year: primary.year ?? extras.find((e) => e.year)?.year ?? null,
    resolvedName: primary.resolvedName ?? itemId,
    isMockData: false,
    extendedPrices,
  };
}

// ───────────────────────── TCG sources ─────────────────────────

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

async function tryScryfall(itemId: string): Promise<PartialPrice | null> {
  const { init, cancel } = abortableInit({
    headers: {
      "User-Agent": process.env.SCRYFALL_USER_AGENT || "GrailBabe/1.0",
      Accept: "application/json",
    },
  });
  try {
    const result = await cachedJson<ScryfallCard>(
      `scanner:scryfall:${itemId.toLowerCase()}`,
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(itemId)}`,
      init,
    );
    const data = result.data;
    const usd = Number(data.prices?.usd ?? 0);
    const foil = Number(data.prices?.usd_foil ?? 0);
    if (usd <= 0) return null;
    const extended: PriceData["extendedPrices"] = [];
    if (foil > 0)
      extended.push({
        label: "Foil / Holo",
        value: `$${foil.toFixed(2)}`,
        note: "Scryfall market",
      });
    extended.push(
      {
        label: "PSA 9 estimate",
        value: `$${(usd * 3).toFixed(2)}`,
        note: "Typical 3× raw multiplier",
      },
      {
        label: "PSA 10 estimate",
        value: `$${(usd * 8).toFixed(2)}`,
        note: "Typical 8× raw multiplier",
      },
    );
    return {
      mid: usd,
      low: round2(usd * 0.75),
      high: round2(usd * 1.5),
      source: "Scryfall",
      set: data.set_name ?? null,
      year: data.released_at ? Number(data.released_at.slice(0, 4)) || null : null,
      resolvedName: data.name ?? itemId,
      extendedPrices: extended,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface PokemonCardResp {
  data?: Array<{
    name?: string;
    set?: { name?: string; releaseDate?: string };
    tcgplayer?: {
      prices?: Record<string, { low?: number; mid?: number; high?: number; market?: number }>;
    };
  }>;
}

async function tryPokemonTcg(itemId: string): Promise<PartialPrice | null> {
  const key = process.env.POKEMON_TCG_API_KEY;
  const { init, cancel } = abortableInit({
    headers: key ? { "X-Api-Key": key } : {},
  });
  try {
    const base = process.env.POKEMON_TCG_BASE_URL || "https://api.pokemontcg.io/v2";
    const q = encodeURIComponent(`name:"${itemId.replace(/"/g, "")}"`);
    const result = await cachedJson<PokemonCardResp>(
      `scanner:pokemon:${itemId.toLowerCase()}`,
      `${base}/cards?q=${q}&pageSize=1`,
      init,
    );
    const card = result.data.data?.[0];
    if (!card) return null;
    const priceBucket =
      Object.values(card.tcgplayer?.prices ?? {}).find((p) => p && (p.market || p.mid)) ?? null;
    const market = priceBucket?.market ?? priceBucket?.mid ?? 0;
    if (!market || market <= 0) return null;
    return {
      mid: round2(market),
      low: priceBucket?.low ? round2(priceBucket.low) : round2(market * 0.75),
      high: priceBucket?.high ? round2(priceBucket.high) : round2(market * 1.5),
      source: "Pokémon TCG (TCGplayer)",
      set: card.set?.name ?? null,
      year: card.set?.releaseDate
        ? Number(card.set.releaseDate.slice(0, 4)) || null
        : null,
      resolvedName: card.name ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface JustTcgResp {
  data?: Array<{
    name?: string;
    set?: string;
    market_price?: number;
    low_price?: number;
    high_price?: number;
  }>;
}

async function tryJustTcg(itemId: string): Promise<PartialPrice | null> {
  const key = process.env.JUSTTCG_API_KEY;
  if (!key) return null;
  const { init, cancel } = abortableInit({ headers: { "X-API-Key": key } });
  try {
    const base = process.env.JUSTTCG_BASE_URL || "https://justtcg.com/api/v1";
    const result = await cachedJson<JustTcgResp>(
      `scanner:justtcg:${itemId.toLowerCase()}`,
      `${base}/cards?q=${encodeURIComponent(itemId)}`,
      init,
    );
    const card = result.data.data?.[0];
    const mid = card?.market_price ?? 0;
    if (!card || !mid || mid <= 0) return null;
    return {
      mid: round2(mid),
      low: card.low_price ? round2(card.low_price) : null,
      high: card.high_price ? round2(card.high_price) : null,
      source: "JustTCG",
      set: card.set ?? null,
      resolvedName: card.name ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface TcgApiResp {
  data?: Array<{
    name?: string;
    set?: { name?: string };
    prices?: { market?: number; low?: number; high?: number };
  }>;
}

async function tryTcgApi(itemId: string): Promise<PartialPrice | null> {
  const key = process.env.TCGAPI_API_KEY;
  if (!key) return null;
  const { init, cancel } = abortableInit({
    headers: { Authorization: `Bearer ${key}` },
  });
  try {
    const base = process.env.TCGAPI_BASE_URL || "https://tcgapi.dev/api/v1";
    const result = await cachedJson<TcgApiResp>(
      `scanner:tcgapi:${itemId.toLowerCase()}`,
      `${base}/cards?q=${encodeURIComponent(itemId)}`,
      init,
    );
    const card = result.data.data?.[0];
    const mid = card?.prices?.market ?? 0;
    if (!card || !mid || mid <= 0) return null;
    return {
      mid: round2(mid),
      low: card.prices?.low ? round2(card.prices.low) : null,
      high: card.prices?.high ? round2(card.prices.high) : null,
      source: "TCGapi.dev",
      set: card.set?.name ?? null,
      resolvedName: card.name ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

// ───────────────────────── Sports sources ─────────────────────────

interface CardHedgerSearchResp {
  data?: Array<{
    card_id?: string;
    name?: string;
    set?: string;
    year?: number;
    market_value?: number;
    low?: number;
    high?: number;
  }>;
}

async function tryCardHedger(itemId: string): Promise<PartialPrice | null> {
  const key = process.env.CARDHEDGER_API_KEY;
  if (!key) return null;
  const { init, cancel } = abortableInit({
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ search: itemId }),
  });
  try {
    const base = process.env.CARDHEDGER_BASE_URL || "https://api.cardhedger.com";
    const result = await cachedJson<CardHedgerSearchResp>(
      `scanner:cardhedger:${itemId.toLowerCase()}`,
      `${base}/v1/cards/card-search`,
      init,
    );
    const card = result.data.data?.[0];
    const mid = card?.market_value ?? 0;
    if (!card || !mid || mid <= 0) return null;
    return {
      mid: round2(mid),
      low: card.low ? round2(card.low) : null,
      high: card.high ? round2(card.high) : null,
      source: "CardHedger",
      set: card.set ?? null,
      year: card.year ?? null,
      resolvedName: card.name ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface PriceChartingProductsResp {
  status?: string;
  products?: Array<{
    id?: string | number;
    "product-name"?: string;
    "console-name"?: string;
    "release-date"?: string;
    "loose-price"?: number;
    "cib-price"?: number;
    "new-price"?: number;
  }>;
}

async function tryPriceCharting(itemId: string): Promise<PartialPrice | null> {
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) return null;
  const { init, cancel } = abortableInit();
  try {
    const result = await cachedJson<PriceChartingProductsResp>(
      `scanner:pricecharting:${itemId.toLowerCase()}`,
      `https://www.pricecharting.com/api/products?q=${encodeURIComponent(itemId)}&t=${token}`,
      init,
    );
    const product = result.data.products?.[0];
    if (!product) return null;
    // PriceCharting returns prices in cents.
    const loose = product["loose-price"] ? product["loose-price"] / 100 : 0;
    const cib = product["cib-price"] ? product["cib-price"] / 100 : 0;
    const fresh = product["new-price"] ? product["new-price"] / 100 : 0;
    const mid = fresh || cib || loose;
    if (!mid || mid <= 0) return null;
    return {
      mid: round2(mid),
      low: loose > 0 ? round2(loose) : null,
      high: fresh > 0 ? round2(fresh) : null,
      source: "PriceCharting",
      year: product["release-date"]
        ? Number(product["release-date"].slice(0, 4)) || null
        : null,
      resolvedName: product["product-name"] ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface EbaySearchResp {
  itemSummaries?: Array<{
    title?: string;
    price?: { value?: string; currency?: string };
  }>;
  total?: number;
}

async function getEbayTokenInline(): Promise<string | null> {
  const cached = await cacheGet<{ token: string }>("ebay:oauth:client_credentials");
  if (cached?.token) return cached.token;
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) return null;
  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body:
      "grant_type=client_credentials&scope=" +
      encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;
  const ttl = Math.max(60, (body.expires_in ?? 7200) - 60);
  await cacheSet("ebay:oauth:client_credentials", { token: body.access_token }, ttl);
  return body.access_token;
}

async function tryEbay(
  itemId: string,
): Promise<{ partial: PartialPrice | null; soldCount: number }> {
  const token = await getEbayTokenInline().catch(() => null);
  if (!token) return { partial: null, soldCount: 0 };
  const { init, cancel } = abortableInit({
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  try {
    const filter = "buyingOptions:{FIXED_PRICE|AUCTION}";
    const url =
      "https://api.ebay.com/buy/browse/v1/item_summary/search" +
      `?q=${encodeURIComponent(itemId)}` +
      `&filter=${encodeURIComponent(filter)}` +
      `&limit=20`;
    const result = await cachedJson<EbaySearchResp>(
      `scanner:ebay:${itemId.toLowerCase()}`,
      url,
      init,
      300,
    );
    const items = result.data.itemSummaries ?? [];
    const prices = items
      .map((i) => Number(i.price?.value ?? 0))
      .filter((n) => n > 0);
    if (prices.length === 0)
      return { partial: null, soldCount: result.data.total ?? items.length };
    prices.sort((a, b) => a - b);
    const mid = prices[Math.floor(prices.length / 2)]!;
    return {
      partial: {
        mid: round2(mid),
        low: round2(prices[0]!),
        high: round2(prices[prices.length - 1]!),
        source: "eBay (active listings)",
        resolvedName: items[0]?.title ?? itemId,
      },
      soldCount: result.data.total ?? items.length,
    };
  } catch {
    return { partial: null, soldCount: 0 };
  } finally {
    cancel();
  }
}

// ───────────────────────── LEGO sources ─────────────────────────

interface RebrickableSet {
  set_num?: string;
  name?: string;
  year?: number;
  num_parts?: number;
}

async function tryRebrickable(itemId: string): Promise<PartialPrice | null> {
  const key = process.env.REBRICKABLE_API_KEY;
  if (!key) return null;
  const { init, cancel } = abortableInit({
    headers: { Authorization: `key ${key}` },
  });
  try {
    const result = await cachedJson<RebrickableSet>(
      `scanner:rebrickable:set:${itemId}`,
      `https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(itemId)}/`,
      init,
    );
    const data = result.data;
    const parts = data.num_parts ?? 100;
    // Heuristic: $0.12 per piece. Used as fallback when no real market data.
    const mid = round2(parts * 0.12);
    return {
      mid,
      low: round2(mid * 0.7),
      high: round2(mid * 1.8),
      source: "Rebrickable (heuristic from piece count)",
      set: data.set_num ?? null,
      year: data.year ?? null,
      resolvedName: data.name ?? itemId,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

// ───────────────────────── Aggregators ─────────────────────────

function mockTcg(itemId: string, advanced: boolean): PriceData {
  const p = mockPrices(itemId + ":tcg", 12);
  return {
    ...p,
    recentSoldCount: 27,
    sources: ["Mock data — no TCG API returned a price"],
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

function mockSports(itemId: string, advanced: boolean): PriceData {
  const p = mockPrices(itemId + ":sports", 25);
  return {
    ...p,
    recentSoldCount: 14,
    sources: ["Mock data — no sports API returned a price"],
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

function mockLego(itemId: string, advanced: boolean): PriceData {
  const p = mockPrices(itemId + ":lego", 60);
  return {
    ...p,
    recentSoldCount: 9,
    sources: ["Mock data — no LEGO API returned a price"],
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

async function fetchTcgPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  // Run all TCG sources in parallel; use the first successful as primary, others as extras.
  const [scryfall, pokemon, justtcg, tcgapi, ebay] = await Promise.all([
    tryScryfall(itemId),
    tryPokemonTcg(itemId),
    tryJustTcg(itemId),
    tryTcgApi(itemId),
    tryEbay(itemId),
  ]);
  const partials = [scryfall, pokemon, justtcg, tcgapi].filter(
    (r): r is PartialPrice => r !== null,
  );
  if (ebay.partial) partials.push(ebay.partial);
  if (partials.length === 0) return mockTcg(itemId, advanced);
  const [primary, ...extras] = partials;
  return buildResult(itemId, primary!, extras, ebay.soldCount, advanced);
}

async function fetchSportsPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  const [cardhedger, pricecharting, ebay] = await Promise.all([
    tryCardHedger(itemId),
    tryPriceCharting(itemId),
    tryEbay(itemId),
  ]);
  const partials: PartialPrice[] = [];
  if (cardhedger) partials.push(cardhedger);
  if (pricecharting) partials.push(pricecharting);
  if (ebay.partial) partials.push(ebay.partial);
  if (partials.length === 0) return mockSports(itemId, advanced);
  const [primary, ...extras] = partials;
  return buildResult(itemId, primary!, extras, ebay.soldCount, advanced);
}

async function fetchLegoPrice(itemId: string, advanced: boolean): Promise<PriceData> {
  const [pricecharting, rebrickable, ebay] = await Promise.all([
    tryPriceCharting(`LEGO ${itemId}`),
    tryRebrickable(itemId),
    tryEbay(`LEGO ${itemId}`),
  ]);
  // Prefer real market price (PriceCharting / eBay) over the Rebrickable heuristic.
  const partials: PartialPrice[] = [];
  if (pricecharting) partials.push(pricecharting);
  if (ebay.partial) partials.push(ebay.partial);
  if (rebrickable) partials.push(rebrickable);
  if (partials.length === 0) return mockLego(itemId, advanced);
  const [primary, ...extras] = partials;
  return buildResult(itemId, primary!, extras, ebay.soldCount, advanced);
}

// ───────────────────────── AI grading (advanced only) ─────────────────────────

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
