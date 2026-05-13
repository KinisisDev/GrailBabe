/**
 * Auth helper that supports a dev bypass so you can run the app without
 * logging in during development.
 *
 * Set in apps/web/.env.local:
 *   DEV_BYPASS_AUTH=true
 *   DEV_USER_CLERK_ID=dev-user-001   (any string — auto-provisioned in Supabase)
 *
 * Remove both vars (or set DEV_BYPASS_AUTH=false) before deploying to production.
 */

import { auth } from '@clerk/nextjs/server'

export function getActiveClerkId(): string {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return process.env.DEV_USER_CLERK_ID ?? 'dev-user-001'
  }

  const { userId } = auth()
  if (!userId) throw new Error('Not authenticated')
  return userId
}

/** Returns null instead of throwing — use in layouts/pages that render a
 *  redirect rather than crashing. */
export function getActiveClerkIdOrNull(): string | null {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return process.env.DEV_USER_CLERK_ID ?? 'dev-user-001'
  }

  try {
    const { userId } = auth()
    return userId ?? null
  } catch {
    return null
  }
}
