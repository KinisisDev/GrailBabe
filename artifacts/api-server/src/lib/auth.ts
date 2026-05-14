import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

const SCREENNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function sanitizeScreenname(raw: string | null | undefined): string {
  const cleaned = (raw ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 20);
  if (cleaned.length >= 3) return cleaned;
  return (cleaned + "user").slice(0, 20).padEnd(3, "0");
}

async function generateUniqueScreenname(seed: string): Promise<string> {
  const base = sanitizeScreenname(seed);
  if (!SCREENNAME_RE.test(base)) {
    return `collector_${Math.random().toString(36).slice(2, 8)}`;
  }
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 16)}_${i}`;
    const [taken] = await db
      .select({ id: userProfilesTable.id })
      .from(userProfilesTable)
      .where(sql`lower(${userProfilesTable.screenname}) = ${candidate.toLowerCase()}`)
      .limit(1);
    if (!taken) return candidate;
  }
  return `collector_${Math.random().toString(36).slice(2, 8)}`;
}

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  try {
    await ensureUserProfile(userId);
  } catch (err) {
    req.log?.error({ err }, "Failed to ensure user profile");
  }
  next();
};

export async function ensureUserProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (existing) return existing;

  let email: string | null = null;
  let displayName = "Collector";
  let avatarUrl: string | null = null;
  let screennameSeed = "collector";
  try {
    const user = await clerkClient.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
    displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      email?.split("@")[0] ||
      "Collector";
    avatarUrl = user.imageUrl ?? null;
    screennameSeed =
      user.username || email?.split("@")[0] || displayName || "collector";
  } catch {
    // ignore — profile created with defaults
  }

  const screenname = await generateUniqueScreenname(screennameSeed);

  const now = new Date();
  const [created] = await db
    .insert(userProfilesTable)
    .values({
      id: userId,
      email,
      displayName,
      avatarUrl,
      tier: "free",
      screenname,
      screennameChangedAt: now,
      onboardingComplete: true,
    })
    .onConflictDoNothing()
    .returning();
  return created;
}
