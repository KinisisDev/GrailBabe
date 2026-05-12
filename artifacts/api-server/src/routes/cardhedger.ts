import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

function base() {
  return process.env.CARDHEDGER_BASE_URL || "https://api.cardhedger.com";
}
function headers() {
  const key = process.env.CARDHEDGER_API_KEY;
  if (!key) throw new Error("CARDHEDGER_API_KEY not configured");
  return {
    "X-API-Key": key,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

router.get("/cardhedger/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const sport = String(req.query.sport ?? "").trim();
  const grade = String(req.query.grade ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const body: Record<string, unknown> = { search: q };
    if (sport) body.category = sport;
    if (grade) body.grade = grade;
    const result = await cachedJson(
      `cardhedger:search:${q}:${sport}:${grade}`,
      `${base()}/v1/cards/card-search`,
      { method: "POST", headers: headers(), body: JSON.stringify(body) },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "CardHedger search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/cardhedger/card/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await cachedJson(
      `cardhedger:card:${id}`,
      `${base()}/v1/cards/card-details`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ card_id: id }),
      },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "CardHedger card failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/cardhedger/price-history/:id", async (req, res) => {
  const { id } = req.params;
  const grade = String(req.query.grade ?? "PSA 9").trim();
  const days = Math.min(365, Math.max(1, Number(req.query.days ?? 180)));
  try {
    const result = await cachedJson(
      `cardhedger:history:${id}:${grade}:${days}`,
      `${base()}/v1/cards/prices-by-card`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ card_id: id, grade, days }),
      },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "CardHedger price history failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
