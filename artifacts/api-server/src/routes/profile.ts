import { Router, type IRouter } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getProfileWithCounts, limitsFor, toTier } from "../lib/profile";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const data = await getProfileWithCounts(userId);
  if (!data) return res.status(404).json({ error: "Profile not found" });
  const tier = toTier(data.profile.tier);
  const subscriptionStatus = data.profile.subscriptionStatus ?? null;
  const active =
    tier === "premium" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing");
  const interval =
    data.profile.subscriptionInterval === "month"
      ? "month"
      : data.profile.subscriptionInterval === "year"
        ? "year"
        : null;

  const out = GetMeResponse.parse({
    profile: {
      id: data.profile.id,
      displayName: data.profile.displayName,
      avatarUrl: data.profile.avatarUrl,
      bio: data.profile.bio,
      tier,
      vaultCount: data.vaultCount,
      grailCount: data.grailCount,
      createdAt: data.profile.createdAt,
    },
    subscription: {
      tier,
      active,
      interval,
      currentPeriodEnd: data.profile.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: data.profile.cancelAtPeriodEnd,
    },
    limits: limitsFor(tier),
  });
  return res.json(out);
});

router.patch("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const body = UpdateMeBody.parse(req.body);
  const [updated] = await db
    .update(userProfilesTable)
    .set({
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      ...(body.bio !== undefined && { bio: body.bio }),
    })
    .where(eq(userProfilesTable.id, userId))
    .returning();
  const data = await getProfileWithCounts(userId);
  const out = UpdateMeResponse.parse({
    id: updated.id,
    displayName: updated.displayName,
    avatarUrl: updated.avatarUrl,
    bio: updated.bio,
    tier: toTier(updated.tier),
    vaultCount: data?.vaultCount ?? 0,
    grailCount: data?.grailCount ?? 0,
    createdAt: updated.createdAt,
  });
  return res.json(out);
});

export default router;
