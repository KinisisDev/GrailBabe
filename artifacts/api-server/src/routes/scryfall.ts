import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

function base() {
  return process.env.SCRYFALL_BASE_URL || "https://api.scryfall.com";
}
function headers() {
  return {
    "User-Agent": process.env.SCRYFALL_USER_AGENT || "GrailBabe/1.0",
    Accept: "application/json",
  };
}

router.get("/scryfall/card", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Missing query name" });
  try {
    const result = await cachedJson(
      `scryfall:named:${name.toLowerCase()}`,
      `${base()}/cards/named?fuzzy=${encodeURIComponent(name)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Scryfall named lookup failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/scryfall/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const result = await cachedJson(
      `scryfall:search:${q.toLowerCase()}`,
      `${base()}/cards/search?q=${encodeURIComponent(q)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Scryfall search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/scryfall/set/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const result = await cachedJson(
      `scryfall:set:${code.toLowerCase()}`,
      `${base()}/sets/${encodeURIComponent(code)}`,
      { headers: headers() },
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Scryfall set failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
