/**
 * Seed dev data for the dashboard + analytics pages.
 *
 * Usage:
 *   USER_ID=<entraUserId> pnpm --filter @workspace/api-server run seed:dev
 *   pnpm --filter @workspace/api-server run seed:dev          # seeds all existing profiles
 *   pnpm --filter @workspace/api-server run seed:dev --reset  # wipes seeded rows first
 *
 * Idempotent-ish: items/grails/trades are matched by `sku`/`name+category` for the user
 * and skipped if present. Activity + price snapshots are always re-emitted unless --reset
 * is passed.
 */
import "dotenv/config";
import {
  db,
  userProfilesTable,
  collectionItemsTable,
  grailItemsTable,
  tradePostsTable,
  activityEventsTable,
  priceSnapshotsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

type SeedItem = {
  name: string;
  brand: string | null;
  category: string;
  condition: "mint" | "near_mint" | "excellent" | "good" | "fair" | "poor";
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string; // YYYY-MM-DD
  sku: string;
  tags: string[];
  notes: string | null;
};

const ITEMS: SeedItem[] = [
  // --- TCG: Pokémon ---
  { name: "Charizard ex 199/197", brand: "Pokemon", category: "tcg", condition: "near_mint", purchasePrice: 180, currentValue: 285, purchaseDate: "2025-09-12", sku: "SEED-PKM-001", tags: ["pokemon", "obsidian-flames", "ex"], notes: "Pulled from booster, sleeved." },
  { name: "Pikachu V Promo SWSH062", brand: "Pokemon", category: "tcg", condition: "mint", purchasePrice: 25, currentValue: 22, purchaseDate: "2025-08-04", sku: "SEED-PKM-002", tags: ["pokemon", "promo"], notes: null },
  { name: "Umbreon VMAX Alt Art 215", brand: "Pokemon", category: "tcg", condition: "near_mint", purchasePrice: 420, currentValue: 615, purchaseDate: "2025-06-22", sku: "SEED-PKM-003", tags: ["pokemon", "evolving-skies", "alt-art"], notes: "PSA 9 candidate." },
  { name: "Moonbreon Sealed Booster Box", brand: "Pokemon", category: "tcg", condition: "mint", purchasePrice: 320, currentValue: 540, purchaseDate: "2024-11-30", sku: "SEED-PKM-004", tags: ["pokemon", "sealed", "evolving-skies"], notes: null },

  // --- TCG: MTG ---
  { name: "Black Lotus Unlimited (LP)", brand: "Magic", category: "tcg", condition: "good", purchasePrice: 7800, currentValue: 9500, purchaseDate: "2024-04-18", sku: "SEED-MTG-001", tags: ["mtg", "reserved-list", "vintage"], notes: "Light play wear, signed by collector." },
  { name: "Liliana of the Veil (FOIL)", brand: "Magic", category: "tcg", condition: "near_mint", purchasePrice: 220, currentValue: 195, purchaseDate: "2025-02-14", sku: "SEED-MTG-002", tags: ["mtg", "modern"], notes: null },
  { name: "Mox Pearl Beta", brand: "Magic", category: "tcg", condition: "fair", purchasePrice: 4800, currentValue: 5400, purchaseDate: "2024-09-05", sku: "SEED-MTG-003", tags: ["mtg", "power-nine"], notes: "Crease bottom-left." },

  // --- TCG: Yu-Gi-Oh ---
  { name: "Blue-Eyes White Dragon LOB-001 1st Ed", brand: "Yu-Gi-Oh", category: "tcg", condition: "excellent", purchasePrice: 380, currentValue: 470, purchaseDate: "2025-01-08", sku: "SEED-YGO-001", tags: ["yugioh", "lob"], notes: null },
  { name: "Dark Magician Girl MFC-000 Secret", brand: "Yu-Gi-Oh", category: "tcg", condition: "near_mint", purchasePrice: 290, currentValue: 340, purchaseDate: "2025-03-20", sku: "SEED-YGO-002", tags: ["yugioh", "secret-rare"], notes: null },

  // --- TCG: One Piece ---
  { name: "Monkey D. Luffy OP01-001 SR", brand: "One Piece", category: "tcg", condition: "mint", purchasePrice: 95, currentValue: 130, purchaseDate: "2025-10-02", sku: "SEED-OP-001", tags: ["onepiece", "leader"], notes: null },
  { name: "Roronoa Zoro Manga Alt Art", brand: "One Piece", category: "tcg", condition: "near_mint", purchasePrice: 145, currentValue: 210, purchaseDate: "2025-07-12", sku: "SEED-OP-002", tags: ["onepiece", "alt-art"], notes: null },

  // --- TCG: Lorcana ---
  { name: "Elsa Spirit of Winter Enchanted", brand: "Lorcana", category: "tcg", condition: "near_mint", purchasePrice: 380, currentValue: 525, purchaseDate: "2025-05-30", sku: "SEED-LOR-001", tags: ["lorcana", "enchanted"], notes: null },

  // --- LEGO ---
  { name: "10497 Galaxy Explorer", brand: "LEGO", category: "lego", condition: "mint", purchasePrice: 99, currentValue: 165, purchaseDate: "2024-12-15", sku: "SEED-LEGO-001", tags: ["lego", "icons", "sealed"], notes: "MISB, perfect corners." },
  { name: "10220 VW T1 Camper Van (Sealed)", brand: "LEGO", category: "lego", condition: "mint", purchasePrice: 120, currentValue: 245, purchaseDate: "2024-07-22", sku: "SEED-LEGO-002", tags: ["lego", "icons", "retired"], notes: null },
  { name: "75192 UCS Millennium Falcon", brand: "LEGO", category: "lego", condition: "mint", purchasePrice: 800, currentValue: 1180, purchaseDate: "2024-02-10", sku: "SEED-LEGO-003", tags: ["lego", "star-wars", "ucs"], notes: "Sealed, white box." },
  { name: "21318 Tree House", brand: "LEGO", category: "lego", condition: "near_mint", purchasePrice: 250, currentValue: 410, purchaseDate: "2024-10-01", sku: "SEED-LEGO-004", tags: ["lego", "ideas", "retired"], notes: "Opened, complete with box + manual." },
  { name: "10307 Eiffel Tower", brand: "LEGO", category: "lego", condition: "mint", purchasePrice: 630, currentValue: 720, purchaseDate: "2025-01-25", sku: "SEED-LEGO-005", tags: ["lego", "icons"], notes: null },
  { name: "75313 UCS AT-AT", brand: "LEGO", category: "lego", condition: "mint", purchasePrice: 800, currentValue: 925, purchaseDate: "2025-04-04", sku: "SEED-LEGO-006", tags: ["lego", "star-wars", "ucs"], notes: null },

  // --- Sports ---
  { name: "Michael Jordan 1986 Fleer #57 PSA 7", brand: "Fleer", category: "sports", condition: "near_mint", purchasePrice: 7200, currentValue: 8400, purchaseDate: "2024-06-18", sku: "SEED-SPT-001", tags: ["nba", "rookie", "psa"], notes: "PSA 7, well-centered." },
  { name: "LeBron James 2003 Topps Chrome RC PSA 9", brand: "Topps", category: "sports", condition: "mint", purchasePrice: 1900, currentValue: 2350, purchaseDate: "2025-02-28", sku: "SEED-SPT-002", tags: ["nba", "rookie", "psa"], notes: null },
  { name: "Tom Brady 2000 Bowman Chrome #236 PSA 8", brand: "Bowman", category: "sports", condition: "near_mint", purchasePrice: 4100, currentValue: 3850, purchaseDate: "2024-08-15", sku: "SEED-SPT-003", tags: ["nfl", "rookie", "psa"], notes: null },
  { name: "Patrick Mahomes 2017 Prizm RC", brand: "Panini", category: "sports", condition: "mint", purchasePrice: 280, currentValue: 360, purchaseDate: "2025-03-11", sku: "SEED-SPT-004", tags: ["nfl", "rookie"], notes: null },
  { name: "Shohei Ohtani 2018 Topps Update RC", brand: "Topps", category: "sports", condition: "mint", purchasePrice: 95, currentValue: 145, purchaseDate: "2025-05-08", sku: "SEED-SPT-005", tags: ["mlb", "rookie"], notes: null },
  { name: "Connor Bedard 2023 Upper Deck Young Guns RC", brand: "Upper Deck", category: "sports", condition: "mint", purchasePrice: 320, currentValue: 285, purchaseDate: "2025-08-20", sku: "SEED-SPT-006", tags: ["nhl", "rookie"], notes: null },

  // --- Other / Sealed ---
  { name: "Pokemon 151 Booster Bundle (Sealed)", brand: "Pokemon", category: "other", condition: "mint", purchasePrice: 28, currentValue: 42, purchaseDate: "2025-09-29", sku: "SEED-OTH-001", tags: ["pokemon", "sealed"], notes: null },
];

const GRAILS: Array<{
  name: string;
  category: string;
  targetPrice: number;
  priority: "low" | "medium" | "high";
  notes: string | null;
}> = [
  { name: "Charizard 1999 Base Set Shadowless PSA 10", category: "tcg", targetPrice: 18000, priority: "high", notes: "The white whale." },
  { name: "Pikachu Illustrator", category: "tcg", targetPrice: 850000, priority: "high", notes: "One day." },
  { name: "Umbreon Gold Star POP Series 5", category: "tcg", targetPrice: 4200, priority: "high", notes: null },
  { name: "Black Lotus Alpha (any grade)", category: "tcg", targetPrice: 25000, priority: "medium", notes: null },
  { name: "10179 UCS Millennium Falcon (Original 2007)", category: "lego", targetPrice: 6500, priority: "high", notes: "Sealed only." },
  { name: "10189 Taj Mahal (Original)", category: "lego", targetPrice: 3200, priority: "medium", notes: null },
  { name: "Mickey Mantle 1952 Topps #311 (any grade)", category: "sports", targetPrice: 35000, priority: "high", notes: null },
  { name: "Wayne Gretzky 1979 O-Pee-Chee #18 PSA 8+", category: "sports", targetPrice: 12000, priority: "medium", notes: null },
  { name: "Kobe Bryant 1996 Topps Chrome Refractor PSA 10", category: "sports", targetPrice: 15000, priority: "medium", notes: null },
  { name: "Charizard VMAX Rainbow Rare PSA 10", category: "tcg", targetPrice: 950, priority: "low", notes: null },
];

const TRADES: Array<{
  title: string;
  description: string;
  category: string;
  condition: string;
  askingPrice: number | null;
  kind: "trade" | "sell" | "buy";
  wantedItems: string[];
  status: "open" | "pending" | "closed";
  daysAgo: number;
}> = [
  { title: "FT Moonbreon Sealed Booster Box", description: "Mint sealed box, never displayed. Trade for vintage Pokemon WOTC sealed.", category: "tcg", condition: "mint", askingPrice: 540, kind: "trade", wantedItems: ["WOTC Base Set Booster Pack", "1st Ed Jungle Box"], status: "open", daysAgo: 2 },
  { title: "FS LeBron 2003 Topps Chrome RC PSA 9", description: "Sub'd in 2024, fresh slab. PWE optional, BMWT $25.", category: "sports", condition: "mint", askingPrice: 2350, kind: "sell", wantedItems: [], status: "open", daysAgo: 5 },
  { title: "ISO 75313 UCS AT-AT Sealed", description: "Looking for sealed AT-AT. Have cash + cards to trade.", category: "lego", condition: "mint", askingPrice: null, kind: "buy", wantedItems: ["75313 UCS AT-AT"], status: "open", daysAgo: 8 },
  { title: "FT Umbreon VMAX Alt Art for slabs", description: "Raw NM, clean centering. Want PSA 9/10 vintage Pokemon.", category: "tcg", condition: "near_mint", askingPrice: 615, kind: "trade", wantedItems: ["PSA 9 Charizard", "PSA 10 Blastoise"], status: "pending", daysAgo: 14 },
  { title: "FS LEGO 10220 VW Camper Sealed", description: "Retired Icons set. Local pickup or shipped insured.", category: "lego", condition: "mint", askingPrice: 245, kind: "sell", wantedItems: [], status: "open", daysAgo: 21 },
  { title: "FT Bedard Young Guns RC", description: "Mint pull, willing to trade for Mahomes Prizm or cash.", category: "sports", condition: "mint", askingPrice: 285, kind: "trade", wantedItems: ["Patrick Mahomes Prizm RC"], status: "closed", daysAgo: 35 },
];

function nowMinusDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function rand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
}

async function seedForUser(userId: string, opts: { reset: boolean }) {
  console.log(`\n→ Seeding for user ${userId}`);

  if (opts.reset) {
    console.log("  · Resetting prior seed rows…");
    const existing = await db
      .select({ id: collectionItemsTable.id })
      .from(collectionItemsTable)
      .where(
        and(
          eq(collectionItemsTable.userId, userId),
          inArray(
            collectionItemsTable.sku,
            ITEMS.map((i) => i.sku),
          ),
        ),
      );
    const ids = existing.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .delete(priceSnapshotsTable)
        .where(inArray(priceSnapshotsTable.itemId, ids));
      await db
        .delete(collectionItemsTable)
        .where(inArray(collectionItemsTable.id, ids));
    }
    await db
      .delete(activityEventsTable)
      .where(eq(activityEventsTable.userId, userId));
    await db
      .delete(grailItemsTable)
      .where(eq(grailItemsTable.userId, userId));
    await db
      .delete(tradePostsTable)
      .where(eq(tradePostsTable.userId, userId));
  }

  // --- Vault items ---
  const existingItems = await db
    .select({ id: collectionItemsTable.id, sku: collectionItemsTable.sku })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));
  const existingSkus = new Set(existingItems.map((i) => i.sku));

  const toInsert = ITEMS.filter((i) => !existingSkus.has(i.sku));
  let insertedItems: { id: number; sku: string | null; name: string; createdAt: Date }[] = [];
  if (toInsert.length > 0) {
    insertedItems = await db
      .insert(collectionItemsTable)
      .values(
        toInsert.map((i) => ({
          userId,
          name: i.name,
          brand: i.brand,
          category: i.category,
          condition: i.condition,
          purchasePrice: i.purchasePrice.toFixed(2),
          currentValue: i.currentValue.toFixed(2),
          purchaseDate: i.purchaseDate,
          notes: i.notes,
          tags: i.tags,
          sku: i.sku,
          photos: [],
        })),
      )
      .returning({
        id: collectionItemsTable.id,
        sku: collectionItemsTable.sku,
        name: collectionItemsTable.name,
        createdAt: collectionItemsTable.createdAt,
      });
    console.log(`  · Inserted ${insertedItems.length} vault items`);
  } else {
    console.log("  · Vault items already present, skipping inserts");
  }

  // Refresh full set so we can write snapshots for everything
  const allItems = await db
    .select({
      id: collectionItemsTable.id,
      sku: collectionItemsTable.sku,
      name: collectionItemsTable.name,
      currentValue: collectionItemsTable.currentValue,
      purchasePrice: collectionItemsTable.purchasePrice,
      purchaseDate: collectionItemsTable.purchaseDate,
    })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));

  // --- Price snapshots: weekly points for the last 90 days, walking from purchase to current ---
  const seededIds = allItems
    .filter((i) => i.sku?.startsWith("SEED-"))
    .map((i) => i.id);

  if (seededIds.length > 0) {
    await db
      .delete(priceSnapshotsTable)
      .where(inArray(priceSnapshotsTable.itemId, seededIds));
  }

  const snapRows: Array<{
    itemId: number;
    price: string;
    source: string;
    recordedAt: Date;
  }> = [];
  for (const item of allItems) {
    if (!item.sku?.startsWith("SEED-")) continue;
    const cur = item.currentValue ? Number(item.currentValue) : 0;
    const buy = item.purchasePrice ? Number(item.purchasePrice) : cur;
    const r = rand(item.id * 9301 + 49297);
    // Weekly points over 90 days, from buy → current with noise
    const POINTS = 13;
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const base = buy + (cur - buy) * t;
      const noise = (r() - 0.5) * 0.06 * Math.max(buy, cur, 1);
      const price = Math.max(0.5, base + noise);
      snapRows.push({
        itemId: item.id,
        price: price.toFixed(2),
        source: "auto",
        recordedAt: nowMinusDays(90 - i * (90 / (POINTS - 1))),
      });
    }
    // Final point pinned to current value, today
    snapRows.push({
      itemId: item.id,
      price: cur.toFixed(2),
      source: "auto",
      recordedAt: new Date(),
    });
  }
  if (snapRows.length > 0) {
    await db.insert(priceSnapshotsTable).values(snapRows);
    console.log(`  · Inserted ${snapRows.length} price snapshots`);
  }

  // --- Grails ---
  const existingGrails = await db
    .select({ name: grailItemsTable.name })
    .from(grailItemsTable)
    .where(eq(grailItemsTable.userId, userId));
  const existingGrailNames = new Set(existingGrails.map((g) => g.name));
  const grailsToInsert = GRAILS.filter((g) => !existingGrailNames.has(g.name));
  if (grailsToInsert.length > 0) {
    await db.insert(grailItemsTable).values(
      grailsToInsert.map((g) => ({
        userId,
        name: g.name,
        category: g.category,
        targetPrice: g.targetPrice.toFixed(2),
        priority: g.priority,
        notes: g.notes,
        acquired: false,
      })),
    );
    console.log(`  · Inserted ${grailsToInsert.length} grails`);
  } else {
    console.log("  · Grails already present, skipping");
  }

  // --- Trade posts ---
  const existingTrades = await db
    .select({ title: tradePostsTable.title })
    .from(tradePostsTable)
    .where(eq(tradePostsTable.userId, userId));
  const existingTradeTitles = new Set(existingTrades.map((t) => t.title));
  const tradesToInsert = TRADES.filter((t) => !existingTradeTitles.has(t.title));
  if (tradesToInsert.length > 0) {
    await db.insert(tradePostsTable).values(
      tradesToInsert.map((t) => ({
        userId,
        title: t.title,
        description: t.description,
        category: t.category,
        condition: t.condition,
        askingPrice: t.askingPrice !== null ? t.askingPrice.toFixed(2) : null,
        kind: t.kind,
        wantedItems: t.wantedItems,
        status: t.status,
        photos: [],
        createdAt: nowMinusDays(t.daysAgo),
      })),
    );
    console.log(`  · Inserted ${tradesToInsert.length} trade posts`);
  } else {
    console.log("  · Trades already present, skipping");
  }

  // --- Activity feed ---
  await db
    .delete(activityEventsTable)
    .where(eq(activityEventsTable.userId, userId));
  const activityRows: Array<{
    userId: string;
    kind: string;
    message: string;
    itemId: number | null;
    createdAt: Date;
  }> = [];
  // Recent vault adds (newest 6 items)
  const recent = [...allItems].slice(0, 6);
  recent.forEach((it, i) => {
    activityRows.push({
      userId,
      kind: "vault_add",
      message: `Added "${it.name}" to your vault`,
      itemId: it.id,
      createdAt: nowMinusDays(i + 1),
    });
  });
  // Price changes
  recent.slice(0, 4).forEach((it, i) => {
    const cur = Number(it.currentValue ?? 0);
    const buy = Number(it.purchasePrice ?? cur);
    const delta = cur - buy;
    if (Math.abs(delta) < 1) return;
    activityRows.push({
      userId,
      kind: "price_change",
      message: `${it.name} ${delta > 0 ? "is up" : "dropped"} $${Math.abs(delta).toFixed(0)} since purchase`,
      itemId: it.id,
      createdAt: nowMinusDays(i * 2 + 3),
    });
  });
  // Grail acquired
  activityRows.push({
    userId,
    kind: "grail_add",
    message: "Added \"Pikachu Illustrator\" to your grail list",
    itemId: null,
    createdAt: nowMinusDays(7),
  });
  // Trade posted
  activityRows.push({
    userId,
    kind: "trade_post",
    message: "Posted a new trade: \"FT Moonbreon Sealed Booster Box\"",
    itemId: null,
    createdAt: nowMinusDays(2),
  });
  // Forum post
  activityRows.push({
    userId,
    kind: "forum_post",
    message: "Posted in Community: \"What's everyone hunting this month?\"",
    itemId: null,
    createdAt: nowMinusDays(4),
  });
  await db.insert(activityEventsTable).values(activityRows);
  console.log(`  · Inserted ${activityRows.length} activity events`);
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const envUserId = process.env.USER_ID?.trim();

  let userIds: string[] = [];
  if (envUserId) {
    userIds = [envUserId];
  } else {
    const profiles = await db
      .select({ id: userProfilesTable.id, name: userProfilesTable.displayName })
      .from(userProfilesTable);
    if (profiles.length === 0) {
      console.log(
        "\n⚠ No user profiles found in the database.\n" +
          "  Sign in to GrailBabe at least once to create a profile, then re-run\n" +
          "  with `USER_ID=<your-entra-oid>` or just re-run this script.\n",
      );
      process.exit(0);
    }
    console.log(
      `Found ${profiles.length} user profile(s):\n${profiles
        .map((p) => `  - ${p.id}  (${p.name})`)
        .join("\n")}`,
    );
    userIds = profiles.map((p) => p.id);
  }

  for (const id of userIds) {
    await seedForUser(id, { reset });
  }
  console.log("\n✓ Seed complete.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
