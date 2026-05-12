import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

function base() {
  return process.env.POKEMON_TCG_BASE_URL || "https://api.pokemontcg.io/v2";
}
function headers(): Record<string, string> {
  const key = process.env.POKEMON_TCG_API_KEY;
  return key ? { "X-Api-Key": key } : {};
}

router.get("/pokemon/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(250, Math.max(1, Number(req.query.pageSize ?? 20)));
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const result = await cachedJson(
      `pokemon:search:${q}:${page}:${pageSize}`,
      `${base()}/cards?q=${encodeURIComponent(`name:${q}*`)}&page=${page}&pageSize=${pageSize}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Pokemon search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/pokemon/sets", async (req, res) => {
  try {
    const result = await cachedJson(
      `pokemon:sets`,
      `${base()}/sets`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Pokemon sets failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/pokemon/card/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await cachedJson(
      `pokemon:card:${id}`,
      `${base()}/cards/${encodeURIComponent(id)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Pokemon card failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
