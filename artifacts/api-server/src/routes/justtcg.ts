import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

function base() {
  return process.env.JUSTTCG_BASE_URL || "https://justtcg.com/api/v1";
}
function headers() {
  const key = process.env.JUSTTCG_API_KEY;
  if (!key) throw new Error("JUSTTCG_API_KEY not configured");
  return { "X-API-Key": key };
}

router.get("/justtcg/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const game = String(req.query.game ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const url =
      `${base()}/cards?q=${encodeURIComponent(q)}` +
      (game ? `&game=${encodeURIComponent(game)}` : "");
    const result = await cachedJson(
      `justtcg:search:${q}:${game}`,
      url,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "JustTCG search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/justtcg/card/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await cachedJson(
      `justtcg:card:${id}`,
      `${base()}/cards/${encodeURIComponent(id)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "JustTCG card failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
