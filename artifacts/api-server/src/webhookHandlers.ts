import { getStripeSync } from "./stripeClient";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";
import type Stripe from "stripe";

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Webhook payload must be a Buffer");
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString()) as Stripe.Event;
      await syncSubscriptionToProfile(event);
    } catch (err) {
      logger.error({ err }, "Failed to sync subscription to profile");
    }
  }
}

async function syncSubscriptionToProfile(event: Stripe.Event) {
  const relevant = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.completed",
  ];
  if (!relevant.includes(event.type)) return;

  let customerId: string | null = null;
  let subscription: Stripe.Subscription | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    customerId = (session.customer as string) ?? null;
    if (session.subscription && customerId) {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
    }
  } else {
    subscription = event.data.object as Stripe.Subscription;
    customerId = subscription.customer as string;
  }

  if (!customerId) return;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.stripeCustomerId, customerId))
    .limit(1);

  if (!profile) return;

  if (event.type === "customer.subscription.deleted" || !subscription) {
    await db
      .update(userProfilesTable)
      .set({
        tier: "free",
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        cancelAtPeriodEnd: false,
      })
      .where(eq(userProfilesTable.id, profile.id));
    return;
  }

  const status = subscription.status;
  const item = subscription.items.data[0];
  const interval = item?.price?.recurring?.interval ?? null;
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const tier =
    status === "active" || status === "trialing" ? "premium" : "free";

  await db
    .update(userProfilesTable)
    .set({
      tier,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionInterval: interval,
      subscriptionCurrentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
    .where(eq(userProfilesTable.id, profile.id));
}
