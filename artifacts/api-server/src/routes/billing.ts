import { Router, type IRouter } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListBillingPlansResponse,
  CreateCheckoutBody,
  CreateCheckoutResponse,
  CreateBillingPortalResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PREMIUM_FEATURES = [
  "Unlimited vault items",
  "Unlimited grail list",
  "AI-powered portfolio insights",
  "AI search across your vault",
  "Live price tracking",
  "Barcode scanner",
  "CSV import & export",
  "Priority support",
];

interface PlanRow {
  id: string;
  unit_amount: number | null;
  currency: string;
  interval: string | null;
  [key: string]: unknown;
}

async function listPremiumPrices(): Promise<PlanRow[]> {
  try {
    const result = await db.execute<PlanRow>(
      sql`SELECT pr.id, pr.unit_amount, pr.currency, (pr.recurring->>'interval') as interval
          FROM stripe.prices pr
          JOIN stripe.products p ON pr.product = p.id
          WHERE pr.active = true
            AND p.active = true
            AND p.name = 'GrailBabe Premium'
            AND (pr.recurring->>'interval') IN ('month','year')
          ORDER BY pr.unit_amount ASC`,
    );
    return result.rows ?? [];
  } catch (err) {
    logger.warn({ err }, "Failed to query stripe.prices");
    return [];
  }
}

router.get("/billing/plans", requireAuth, async (_req, res) => {
  const prices = await listPremiumPrices();
  const plans = [
    {
      id: "free",
      name: "Free",
      tier: "free" as const,
      priceCents: 0,
      interval: "none" as const,
      features: [
        "Up to 25 vault items",
        "Up to 10 grails",
        "Up to 3 categories",
        "Trading board access",
        "Forum access",
      ],
    },
    ...prices.map((p) => ({
      id: p.id,
      name:
        p.interval === "year" ? "Premium (Annual)" : "Premium (Monthly)",
      tier: "premium" as const,
      priceCents: p.unit_amount ?? 0,
      interval: (p.interval === "year" ? "year" : "month") as "month" | "year",
      features: PREMIUM_FEATURES,
    })),
  ];
  return res.json(ListBillingPlansResponse.parse(plans));
});

router.post("/billing/checkout", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateCheckoutBody.parse(req.body);
  if (body.planId === "free") {
    return res.status(400).json({ error: "Cannot checkout the free plan" });
  }
  const allowedPrices = await listPremiumPrices();
  if (!allowedPrices.some((p) => p.id === body.planId)) {
    return res
      .status(400)
      .json({ error: "Unknown or inactive premium plan" });
  }
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const stripe = await getUncachableStripeClient();
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? undefined,
      name: profile.displayName,
      metadata: { userId },
    });
    customerId = customer.id;
    await db
      .update(userProfilesTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(userProfilesTable.id, userId));
  }

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: body.planId, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing?checkout=canceled`,
    allow_promotion_codes: true,
  });
  return res.json(CreateCheckoutResponse.parse({ url: session.url ?? "" }));
});

router.post("/billing/portal", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!profile?.stripeCustomerId) {
    return res.status(400).json({ error: "No Stripe customer on file" });
  }
  const stripe = await getUncachableStripeClient();
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${origin}/billing`,
  });
  return res.json(CreateBillingPortalResponse.parse({ url: portal.url }));
});

export default router;
