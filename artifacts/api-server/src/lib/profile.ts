import {
  db,
  userProfilesTable,
  collectionItemsTable,
  grailItemsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type Tier = "free" | "premium";

export const LIMITS = {
  free: {
    vaultMax: 25,
    grailMax: 10,
    categoriesMax: 3,
    aiEnabled: false,
    livePricing: false,
    scannerEnabled: false,
    csvEnabled: false,
  },
  premium: {
    vaultMax: null,
    grailMax: null,
    categoriesMax: null,
    aiEnabled: true,
    livePricing: true,
    scannerEnabled: true,
    csvEnabled: true,
  },
} as const;

export function limitsFor(tier: Tier) {
  return LIMITS[tier];
}

export async function getProfileWithCounts(userId: string) {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (!profile) return null;

  const [{ count: vaultCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.userId, userId));
  const [{ count: grailCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(grailItemsTable)
    .where(eq(grailItemsTable.userId, userId));

  return {
    profile,
    vaultCount: Number(vaultCount ?? 0),
    grailCount: Number(grailCount ?? 0),
  };
}

export function toTier(value: string | null | undefined): Tier {
  return value === "premium" ? "premium" : "free";
}
