import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/u/:username',
])

// When DEV_BYPASS_AUTH=true, skip all Clerk checks entirely
function devBypassMiddleware(req: NextRequest) {
  return NextResponse.next()
}

export default process.env.DEV_BYPASS_AUTH === 'true'
  ? devBypassMiddleware
  : clerkMiddleware((auth, req) => {
      if (!isPublicRoute(req)) auth().protect()
    })

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
