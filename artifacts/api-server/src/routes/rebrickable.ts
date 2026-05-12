import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();
const BASE = "https://rebrickable.com/api/v3/lego";

function authHeaders() {
  const key = process.env.REBRICKABLE_API_KEY;
  if (!key) throw new Error("REBRICKABLE_API_KEY not configured");
  return { Authorization: `key ${key}` };
}

router.get("/rebrickable/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const result = await cachedJson(
      `rebrickable:search:${q}`,
      `${BASE}/sets/?search=${encodeURIComponent(q)}`,
      { headers: authHeaders() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Rebrickable search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/rebrickable/set/:setNum", async (req, res) => {
  const { setNum } = req.params;
  try {
    const result = await cachedJson(
      `rebrickable:set:${setNum}`,
      `${BASE}/sets/${encodeURIComponent(setNum)}/`,
      { headers: authHeaders() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Rebrickable set failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/rebrickable/set/:setNum/parts", async (req, res) => {
  const { setNum } = req.params;
  try {
    const result = await cachedJson(
      `rebrickable:set:${setNum}:parts`,
      `${BASE}/sets/${encodeURIComponent(setNum)}/parts/`,
      { headers: authHeaders() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Rebrickable parts failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
