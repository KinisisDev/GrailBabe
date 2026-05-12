import { Router, type IRouter } from "express";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

router.get("/psa/cert/:certNumber", async (req, res) => {
  const { certNumber } = req.params;
  if (!/^\d{1,20}$/.test(certNumber)) {
    return res.status(400).json({ error: "Invalid cert number" });
  }
  const token = process.env.PSA_API_TOKEN;
  if (!token) return res.status(500).json({ error: "PSA_API_TOKEN not configured" });
  try {
    const result = await cachedJson(
      `psa:cert:${certNumber}`,
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      { headers: { Authorization: `bearer ${token}` } },
      3600,
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "PSA cert lookup failed");
    return res
      .status(externalErrorStatus(err))
      .json({ error: externalErrorMessage(err) });
  }
});

export default router;
