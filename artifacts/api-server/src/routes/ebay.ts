import { Router, type IRouter } from "express";
import { cacheGet, cacheSet } from "../lib/cache";
import {
  cachedJson,
  externalErrorMessage,
  externalErrorStatus,
} from "../lib/externalFetch";

const router: IRouter = Router();

const EBAY_TOKEN_KEY = "ebay:oauth:client_credentials";

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getEbayToken(): Promise<string> {
  const cached = await cacheGet<{ token: string }>(EBAY_TOKEN_KEY);
  if (cached?.token) return cached.token;

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) throw new Error("eBay credentials not configured");

  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body:
      "grant_type=client_credentials&scope=" +
      encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  const body = (await res.json()) as EbayTokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw Object.assign(new Error(body.error_description || "eBay token request failed"), {
      status: res.status,
    });
  }
  const ttl = Math.max(60, (body.expires_in ?? 7200) - 60);
  await cacheSet(EBAY_TOKEN_KEY, { token: body.access_token }, ttl);
  return body.access_token;
}

router.get("/ebay/sold", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  if (!q) return res.status(400).json({ error: "Missing query q" });

  try {
    const token = await getEbayToken();
    const filter = "buyingOptions:{FIXED_PRICE|AUCTION}";
    const url =
      "https://api.ebay.com/buy/browse/v1/item_summary/search" +
      `?q=${encodeURIComponent(q)}` +
      `&filter=${encodeURIComponent(filter)}` +
      `&limit=${limit}`;
    const result = await cachedJson(
      `ebay:sold:${q}:${limit}`,
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      },
      300,
    );
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "eBay search failed");
    return res
      .status(externalErrorStatus(err))
      .json({ error: externalErrorMessage(err) });
  }
});

export default router;
