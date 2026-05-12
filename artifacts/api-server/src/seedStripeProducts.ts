import { getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";

const PRODUCT_NAME = "GrailBabe Premium";
const MONTHLY_CENTS = 1999;
const YEARLY_CENTS = 16799;

export async function ensurePremiumProduct() {
  try {
    const stripe = await getUncachableStripeClient();
    const search = await stripe.products.search({
      query: `name:'${PRODUCT_NAME}' AND active:'true'`,
    });
    let product = search.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: PRODUCT_NAME,
        description:
          "Unlock unlimited vault, AI insights, live pricing, scanner & CSV.",
      });
      logger.info({ id: product.id }, "Created Stripe product");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    const hasMonthly = prices.data.some(
      (p) => p.recurring?.interval === "month" && p.unit_amount === MONTHLY_CENTS,
    );
    const hasYearly = prices.data.some(
      (p) => p.recurring?.interval === "year" && p.unit_amount === YEARLY_CENTS,
    );
    if (!hasMonthly) {
      await stripe.prices.create({
        product: product.id,
        unit_amount: MONTHLY_CENTS,
        currency: "usd",
        recurring: { interval: "month" },
      });
      logger.info("Created monthly Premium price");
    }
    if (!hasYearly) {
      await stripe.prices.create({
        product: product.id,
        unit_amount: YEARLY_CENTS,
        currency: "usd",
        recurring: { interval: "year" },
      });
      logger.info("Created yearly Premium price");
    }
  } catch (err) {
    logger.warn({ err }, "ensurePremiumProduct failed (continuing)");
  }
}
