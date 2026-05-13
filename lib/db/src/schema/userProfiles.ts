import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable(
  "user_profiles",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    tier: text("tier").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    subscriptionInterval: text("subscription_interval"),
    subscriptionCurrentPeriodEnd: timestamp(
      "subscription_current_period_end",
      { withTimezone: true },
    ),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),

    // --- Public profile + onboarding ---
    screenname: text("screenname"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    lat: real("lat"),
    lng: real("lng"),
    onboardingComplete: boolean("onboarding_complete")
      .notNull()
      .default(false),
    screennameChangedAt: timestamp("screenname_changed_at", {
      withTimezone: true,
    }),
    formerScreenname: text("former_screenname"),
    formerScreennameChangedAt: timestamp("former_screenname_changed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    screennameUniq: uniqueIndex("user_profiles_screenname_lower_uniq").on(
      sql`lower(${t.screenname})`,
    ),
  }),
);

export type UserProfile = typeof userProfilesTable.$inferSelect;
