import { createClerkClient } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function fetchPublicUsers(
  ids: string[],
): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return map;

  const profiles = await db
    .select()
    .from(userProfilesTable)
    .where(inArray(userProfilesTable.id, unique));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const missing: string[] = [];

  for (const id of unique) {
    const p = profileMap.get(id);
    if (p) {
      map.set(id, {
        id,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      });
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    await Promise.all(
      missing.map(async (id) => {
        try {
          const u = await clerkClient.users.getUser(id);
          const displayName =
            [u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.username ||
            u.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            "Collector";
          map.set(id, { id, displayName, avatarUrl: u.imageUrl ?? null });
        } catch {
          map.set(id, { id, displayName: "Collector", avatarUrl: null });
        }
      }),
    );
  }

  return map;
}
