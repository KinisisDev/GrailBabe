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

const SEEKER_FEATURES = [
  "Unlimited scans",
  "Unlimited collection size",
  "Real-time market valuations",
  "All 3 categories (TCG + Sports + LEGO)",
  "Full community access + private messaging",
  "Unlimited trade requests + trade history",
  "Basic portfolio analytics",
  "Price drop / spike alerts",
];

const MASTER_FEATURES = [
  "Everything in Grail Seeker, plus:",
  "Bulk scan + batch edit tools",
  "Advanced analytics (ROI tracking, trend forecasting)",
  "Export collection data (CSV / PDF)",
  "Ad-free experience",
  "Priority support",
  "Early access to new features",
  "Custom collection tags / categories",
];

const SCOUT_FEATURES = [
  "25 scans per month",
  "Up to 100 items in collection",
  "Basic valuations (delayed 24h)",
  "View community feed + post",
  "3 trade requests per month",
  "Single category (TCG, Sports, or LEGO)",
];

type PaidTier = "seeker" | "master";

// Map Stripe product names → our tier identifier.
// The names below must match the product names configured in Stripe.
const TIER_PRODUCT_NAMES: Record<PaidTier, string> = {
  seeker: "Grail Seeker",
  master: "Grail Master",
};

interface PlanRow {
  id: string;
  unit_amount: number | null;
  currency: string;
  interval: string | null;
  product_name: string | null;
  [key: string]: unknown;
}

async function listPaidPrices(): Promise<PlanRow[]> {
  try {
    const productNames = Object.values(TIER_PRODUCT_NAMES);
    const result = await db.execute<PlanRow>(
      sql`SELECT pr.id, pr.unit_amount, pr.currency,
                 (pr.recurring->>'interval') as interval,
                 p.name as product_name
          FROM stripe.prices pr
          JOIN stripe.products p ON pr.product = p.id
          WHERE pr.active = true
            AND p.active = true
            AND p.name IN (${sql.join(
              productNames.map((n) => sql`${n}`),
              sql`, `,
            )})
            AND (pr.recurring->>'interval') IN ('month','year')
          ORDER BY pr.unit_amount ASC`,
    );
    return result.rows ?? [];
  } catch (err) {
    logger.warn({ err }, "Failed to query stripe.prices");
    return [];
  }
}

function tierForProductName(name: string | null): PaidTier | null {
  if (!name) return null;
  for (const [tier, productName] of Object.entries(TIER_PRODUCT_NAMES) as [
    PaidTier,
    string,
  ][]) {
    if (name === productName) return tier;
  }
  return null;
}

function featuresForTier(tier: PaidTier): string[] {
  return tier === "seeker" ? SEEKER_FEATURES : MASTER_FEATURES;
}

function tierLabel(tier: PaidTier): string {
  return tier === "seeker" ? "Grail Seeker" : "Grail Master";
}

router.get("/billing/plans", requireAuth, async (_req, res) => {
  const prices = await listPaidPrices();
  const plans = [
    {
      id: "free",
      name: "Grail Scout",
      tier: "free" as const,
      priceCents: 0,
      interval: "none" as const,
      features: SCOUT_FEATURES,
    },
    ...prices
      .map((p) => {
        const tier = tierForProductName(p.product_name);
        if (!tier) return null;
        const interval = (p.interval === "year" ? "year" : "month") as
          | "month"
          | "year";
        return {
          id: p.id,
          name: `${tierLabel(tier)} (${interval === "year" ? "Annual" : "Monthly"})`,
          tier,
          priceCents: p.unit_amount ?? 0,
          interval,
          features: featuresForTier(tier),
        };
      })
      .filter(<T,>(v: T | null): v is T => v !== null),
  ];
  return res.json(ListBillingPlansResponse.parse(plans));
});

router.post("/billing/checkout", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = CreateCheckoutBody.parse(req.body);
  if (body.planId === "free") {
    return res.status(400).json({ error: "Cannot checkout the free plan" });
  }
  const allowedPrices = await listPaidPrices();
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
