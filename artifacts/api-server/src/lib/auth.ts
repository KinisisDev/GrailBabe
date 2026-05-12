import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

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
  try {
    const user = await clerkClient.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
    displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      email?.split("@")[0] ||
      "Collector";
    avatarUrl = user.imageUrl ?? null;
  } catch {
    // ignore — profile created with defaults
  }

  const [created] = await db
    .insert(userProfilesTable)
    .values({
      id: userId,
      email,
      displayName,
      avatarUrl,
      tier: "free",
    })
    .onConflictDoNothing()
    .returning();
  return created;
}
