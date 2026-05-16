import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await ensureUserProfile(userId, {
      email: req.userEmail,
      displayName: req.userName,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to ensure user profile");
  }
  next();
};

export interface EnsureUserProfileOpts {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export async function ensureUserProfile(
  userId: string,
  opts: EnsureUserProfileOpts = {},
) {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);
  if (existing) return existing;

  const email = opts.email ?? null;
  const displayName =
    opts.displayName?.trim() || email?.split("@")[0] || "Collector";
  const avatarUrl = opts.avatarUrl ?? null;
  const screennameSeed =
    opts.displayName?.trim() || email?.split("@")[0] || "collector";

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
      onboardingComplete: false,
    })
    .onConflictDoNothing()
    .returning();
  return created;
}
