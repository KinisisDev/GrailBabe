import { Router, type IRouter } from "express";
import express from "express";
import {
  db,
  collectionItemsTable,
  activityEventsTable,
  priceSnapshotsTable,
} from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getProfileWithCounts, limitsFor, toTier } from "../lib/profile";

const router: IRouter = Router();

const TCG_GAMES = [
  "pokemon",
  "yugioh",
  "mtg",
  "lorcana",
  "swu",
  "riftbound",
  "digimon",
  "onepiece",
] as const;
type TcgGame = (typeof TCG_GAMES)[number];

const LEGO_HEADERS = [
  "type",
  "name",
  "setNumber",
  "theme",
  "year",
  "status",
  "minifigCount",
  "pieceCount",
  "condition",
  "currentValue",
  "purchasePrice",
  "purchaseDate",
];

const TCG_HEADERS = [
  "game",
  "type",
  "name",
  "setName",
  "cardNumber",
  "gradingService",
  "grade",
  "quantity",
  "releaseYear",
  "sealed",
  "condition",
  "currentValue",
  "purchasePrice",
  "purchaseDate",
];

const LEGO_TEMPLATE_ROW: Record<string, string> = {
  type: "set",
  name: "Millennium Falcon",
  setNumber: "75192",
  theme: "Star Wars",
  year: "2017",
  status: "Sealed",
  minifigCount: "8",
  pieceCount: "7541",
  condition: "mint",
  currentValue: "850",
  purchasePrice: "799.99",
  purchaseDate: "2023-12-01",
};

const TCG_TEMPLATE_ROW: Record<string, string> = {
  game: "pokemon",
  type: "single",
  name: "Charizard",
  setName: "Base Set",
  cardNumber: "4/102",
  gradingService: "PSA",
  grade: "9",
  quantity: "1",
  releaseYear: "1999",
  sealed: "",
  condition: "near_mint",
  currentValue: "1500",
  purchasePrice: "1200",
  purchaseDate: "2024-03-14",
};

const ALLOWED_CONDITIONS = new Set([
  "mint",
  "near_mint",
  "excellent",
  "good",
  "fair",
  "poor",
]);
const ALLOWED_GRADING = new Set(["Raw", "PSA", "BGS", "CGC"]);
const ALLOWED_LEGO_STATUS = new Set(["Sealed", "Built", "Incomplete"]);

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Neutralize spreadsheet formula injection: any cell beginning with =, +, -, @
  // or a leading tab/CR is treated as a formula by Excel/Google Sheets. Prefix
  // a single quote so the spreadsheet renders the literal text instead.
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function requireCsvTier(
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const profile = await getProfileWithCounts(userId);
  if (!profile) {
    return {
      ok: false,
      status: 404,
      body: { error: "Profile not found" },
    };
  }
  const limits = limitsFor(toTier(profile.profile.tier));
  if (!limits.csvEnabled) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "CSV import/export is a Premium feature",
        code: "tier_limit",
      },
    };
  }
  return { ok: true };
}

function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

// RFC 4180-ish parser. Handles quoted fields with embedded commas, newlines,
// and escaped double quotes (""). Strips a leading BOM.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const t = text.replace(/^\uFEFF/, "");
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(
    (r) => !(r.length === 0 || (r.length === 1 && r[0].trim() === "")),
  );
}

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dateStr(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function isCategoryParam(c: unknown): c is "lego" | "tcg" {
  return c === "lego" || c === "tcg";
}

// ---- Template ----
router.get("/vault/template/:category", requireAuth, async (req, res) => {
  const cat = req.params.category;
  if (!isCategoryParam(cat)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  const gate = await requireCsvTier(req.userId!);
  if (!gate.ok) return res.status(gate.status).json(gate.body);
  const headers = cat === "lego" ? LEGO_HEADERS : TCG_HEADERS;
  const sample = cat === "lego" ? LEGO_TEMPLATE_ROW : TCG_TEMPLATE_ROW;
  const csv = buildCsv(headers, [sample]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="grailbabe-${cat}-template.csv"`,
  );
  return res.send(csv);
});

// ---- Export ----
router.get("/vault/export/:category", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const cat = req.params.category;
  if (!isCategoryParam(cat)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  const gate = await requireCsvTier(userId);
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const rows = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId))
    .orderBy(asc(collectionItemsTable.createdAt));

  const filtered = rows.filter((r) =>
    cat === "lego"
      ? r.category.startsWith("lego:")
      : r.category.startsWith("tcg:"),
  );

  const out: Record<string, unknown>[] = filtered.map((r) => {
    let notes: Record<string, unknown> = {};
    if (r.notes) {
      try {
        const parsed = JSON.parse(r.notes);
        if (parsed && typeof parsed === "object") notes = parsed;
      } catch {
        /* ignore */
      }
    }
    const type = r.category.endsWith(":set")
      ? "set"
      : r.category.endsWith(":single")
        ? "single"
        : "";

    if (cat === "lego") {
      return {
        type,
        name: r.name,
        setNumber: notes.setNumber ?? "",
        theme: notes.theme ?? "",
        year: notes.year ?? "",
        status: notes.status ?? "",
        minifigCount: notes.minifigCount ?? "",
        pieceCount: notes.pieceCount ?? "",
        condition: r.condition,
        currentValue: r.currentValue ?? "",
        purchasePrice: r.purchasePrice ?? "",
        purchaseDate: r.purchaseDate ?? "",
      };
    }

    const game = r.category.split(":")[1] ?? "";
    return {
      game,
      type,
      name: r.name,
      setName: r.brand ?? "",
      cardNumber: notes.cardNumber ?? "",
      gradingService: notes.gradingService ?? "",
      grade: notes.grade ?? "",
      quantity: notes.quantity ?? "",
      releaseYear: notes.releaseYear ?? "",
      sealed:
        notes.sealed === true
          ? "yes"
          : notes.sealed === false
            ? "no"
            : "",
      condition: r.condition,
      currentValue: r.currentValue ?? "",
      purchasePrice: r.purchasePrice ?? "",
      purchaseDate: r.purchaseDate ?? "",
    };
  });

  const headers = cat === "lego" ? LEGO_HEADERS : TCG_HEADERS;
  const csv = buildCsv(headers, out);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="grailbabe-${cat}-export.csv"`,
  );
  return res.send(csv);
});

// ---- Import ----
router.post(
  "/vault/import/:category",
  requireAuth,
  express.text({
    type: ["text/csv", "text/plain", "application/csv"],
    limit: "5mb",
  }),
  async (req, res) => {
    const userId = req.userId!;
    const cat = req.params.category;
    if (!isCategoryParam(cat)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const gate = await requireCsvTier(userId);
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const body = typeof req.body === "string" ? req.body : "";
    if (!body.trim()) {
      return res.status(400).json({ error: "Empty CSV body" });
    }

    const parsed = parseCsv(body);
    if (parsed.length < 2) {
      return res
        .status(400)
        .json({ error: "CSV must have a header row and at least one data row" });
    }
    const header = parsed[0].map((h) => h.trim());
    const dataRows = parsed.slice(1);

    const errors: { row: number; message: string }[] = [];
    const inserts: (typeof collectionItemsTable.$inferInsert)[] = [];

    const profile = await getProfileWithCounts(userId);
    const limits = profile ? limitsFor(toTier(profile.profile.tier)) : null;
    let remaining = Number.POSITIVE_INFINITY;
    if (
      limits &&
      limits.vaultMax !== null &&
      limits.vaultMax !== undefined &&
      profile
    ) {
      remaining = Math.max(0, limits.vaultMax - profile.vaultCount);
    }

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2;
      const cells = dataRows[i];
      const get = (key: string): string => {
        const idx = header.indexOf(key);
        if (idx === -1) return "";
        return (cells[idx] ?? "").trim();
      };

      const type = get("type");
      const name = get("name");
      if (!name) {
        errors.push({ row: rowNum, message: "Missing 'name'" });
        continue;
      }
      if (type !== "set" && type !== "single") {
        errors.push({
          row: rowNum,
          message: "'type' must be 'set' or 'single'",
        });
        continue;
      }
      const condition = get("condition") || "near_mint";
      if (!ALLOWED_CONDITIONS.has(condition)) {
        errors.push({
          row: rowNum,
          message: `Invalid condition '${condition}'`,
        });
        continue;
      }

      let category: string;
      let brand: string | undefined;
      let notesObj: Record<string, unknown>;

      if (cat === "lego") {
        category = `lego:${type}`;
        brand = get("setNumber") || undefined;
        const status = get("status");
        if (status && !ALLOWED_LEGO_STATUS.has(status)) {
          errors.push({ row: rowNum, message: `Invalid status '${status}'` });
          continue;
        }
        notesObj = {
          setNumber: get("setNumber") || undefined,
          theme: get("theme") || undefined,
          year: num(get("year")),
          status: status || undefined,
          minifigCount: num(get("minifigCount")),
          pieceCount: num(get("pieceCount")),
        };
      } else {
        const game = get("game");
        if (!TCG_GAMES.includes(game as TcgGame)) {
          errors.push({ row: rowNum, message: `Invalid game '${game}'` });
          continue;
        }
        category = `tcg:${game}:${type}`;
        brand = get("setName") || undefined;
        const gradingService = get("gradingService") || "Raw";
        if (!ALLOWED_GRADING.has(gradingService)) {
          errors.push({
            row: rowNum,
            message: `Invalid gradingService '${gradingService}'`,
          });
          continue;
        }
        const sealedStr = get("sealed").toLowerCase();
        const sealed =
          sealedStr === "yes" || sealedStr === "true"
            ? true
            : sealedStr === "no" || sealedStr === "false"
              ? false
              : undefined;
        notesObj =
          type === "single"
            ? {
                cardNumber: get("cardNumber") || undefined,
                gradingService,
                grade: get("grade") || undefined,
                quantity: num(get("quantity")),
              }
            : {
                releaseYear: num(get("releaseYear")),
                sealed,
              };
      }

      const cleanNotes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(notesObj)) {
        if (v !== undefined) cleanNotes[k] = v;
      }

      inserts.push({
        userId,
        name,
        brand,
        category,
        condition,
        currentValue: num(get("currentValue"))?.toString(),
        purchasePrice: num(get("purchasePrice"))?.toString(),
        purchaseDate: dateStr(get("purchaseDate")),
        notes: JSON.stringify(cleanNotes),
        photos: [],
        tags: [],
      });
    }

    let toInsert = inserts;
    let truncated = 0;
    if (toInsert.length > remaining) {
      truncated = toInsert.length - remaining;
      toInsert = toInsert.slice(0, Math.max(0, Math.floor(remaining)));
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const result = await db
        .insert(collectionItemsTable)
        .values(toInsert)
        .returning({ id: collectionItemsTable.id });
      inserted = result.length;

      const snapshots = toInsert.flatMap((it, idx) =>
        it.currentValue
          ? [
              {
                itemId: result[idx].id,
                price: it.currentValue,
                source: "manual",
              },
            ]
          : [],
      );
      if (snapshots.length > 0) {
        await db.insert(priceSnapshotsTable).values(snapshots);
      }
      await db.insert(activityEventsTable).values({
        userId,
        kind: "vault_add",
        message: `Imported ${inserted} ${cat.toUpperCase()} item${
          inserted === 1 ? "" : "s"
        } from CSV`,
      });
    }

    return res.json({
      inserted,
      errors,
      truncated,
      totalRows: dataRows.length,
    });
  },
);

export default router;
