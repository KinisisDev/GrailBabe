import { db, userProfilesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export interface PublicUser {
  id: string;
  screenname: string | null;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Returns a map of userId -> PublicUser for the given ids. Backed entirely by
 * the local user_profiles table — there is no remote identity-provider lookup.
 * Profiles are created lazily by `requireAuth` -> `ensureUserProfile` on the
 * user's first authenticated request, so any id present in another table that
 * is not yet in user_profiles falls back to a placeholder Collector entry.
 */
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

  for (const id of unique) {
    const p = profileMap.get(id);
    if (p) {
      map.set(id, {
        id,
        screenname: p.screenname,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      });
    } else {
      map.set(id, {
        id,
        screenname: null,
        displayName: "Collector",
        avatarUrl: null,
      });
    }
  }

  return map;
}
