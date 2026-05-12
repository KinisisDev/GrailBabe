import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

function base() {
  return process.env.TCGAPI_BASE_URL || "https://tcgapi.dev/api/v1";
}
function headers() {
  const key = process.env.TCGAPI_API_KEY;
  if (!key) throw new Error("TCGAPI_API_KEY not configured");
  return { Authorization: `Bearer ${key}` };
}

router.get("/tcgapi/games", async (req, res) => {
  try {
    const result = await cachedJson(
      `tcgapi:games`,
      `${base()}/games`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "TCGAPI games failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/tcgapi/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const game = String(req.query.game ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const url =
      `${base()}/cards?q=${encodeURIComponent(q)}` +
      (game ? `&game=${encodeURIComponent(game)}` : "");
    const result = await cachedJson(
      `tcgapi:search:${q}:${game}`,
      url,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "TCGAPI search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/tcgapi/card/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await cachedJson(
      `tcgapi:card:${id}`,
      `${base()}/cards/${encodeURIComponent(id)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "TCGAPI card failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
