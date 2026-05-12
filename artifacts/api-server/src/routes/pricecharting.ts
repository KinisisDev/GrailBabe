import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();
const BASE = "https://www.pricecharting.com/api";

function token() {
  const t = process.env.PRICECHARTING_API_TOKEN;
  if (!t) throw new Error("PRICECHARTING_API_TOKEN not configured");
  return t;
}

router.get("/pricecharting/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.status(400).json({ error: "Missing query q" });
  try {
    const result = await cachedJson(
      `pricecharting:search:${q}`,
      `${BASE}/products?q=${encodeURIComponent(q)}&t=${token()}`,
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "PriceCharting search failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

router.get("/pricecharting/product/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await cachedJson(
      `pricecharting:product:${id}`,
      `${BASE}/product?id=${encodeURIComponent(id)}&t=${token()}`,
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "PriceCharting product failed");
    return res.status(externalErrorStatus(err)).json({ error: externalErrorMessage(err) });
  }
});

export default router;
