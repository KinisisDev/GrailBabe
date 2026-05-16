# GrailBabe

A Pokémon TCG collector / vault / trade / community app. Web (Vite + React), mobile (Expo), and a shared Express + Drizzle API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web run dev` — run the web app
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — typecheck all workspace packages (recursive)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, plus the Entra and Upstash secrets listed below

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: Vite + React 19 (`artifacts/web`)
- Mobile: Expo + expo-router (`artifacts/mobile`)
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Auth — Microsoft Entra External ID

All three artifacts authenticate against a single Entra External ID (CIAM) tenant. Clerk has been fully removed.

- Tenant: `kinislabs.ciamlogin.com` (tenant id `0cd996b2-486d-4cb4-a256-43c14db68570`)
- App registration client id: `c585acb9-882f-4886-87f4-e4335ddad620`
- API scope: `api://c585acb9-882f-4886-87f4-e4335ddad620/access_as_user`
- Authority: `https://kinislabs.ciamlogin.com/{tenantId}` (v2 endpoint)
- User flow: `B2X_1_SignUpandSignin` (handles email/password + any IdPs configured at the tenant)

| Where | Library | Source of truth |
| --- | --- | --- |
| API server | `jose` JWKS verification | `artifacts/api-server/src/middlewares/entraAuth.ts`, `src/lib/entraConfig.ts` |
| Web | `@azure/msal-browser` + `@azure/msal-react` | `artifacts/web/src/lib/auth/msalConfig.ts`, `src/lib/auth/useAuth.ts` |
| Mobile | `expo-auth-session` (PKCE) + `expo-secure-store` | `artifacts/mobile/lib/auth/entraAuthContext.tsx` |

The API server validates `Authorization: Bearer <token>` against the tenant JWKS, asserts `iss`/`aud`/`exp`/`nbf`, and stamps `req.userId` from the `oid` (or fallback `sub`) claim. The `user_profiles.id` column is plain `text` and now stores Entra GUIDs (the table was wiped during migration).

Required env vars:

- API: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_TENANT_SUBDOMAIN`
- Web: `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_SUBDOMAIN`, `VITE_ENTRA_API_SCOPE`
- Mobile: `EXPO_PUBLIC_ENTRA_TENANT_ID`, `EXPO_PUBLIC_ENTRA_CLIENT_ID`, `EXPO_PUBLIC_ENTRA_TENANT_SUBDOMAIN`, `EXPO_PUBLIC_ENTRA_API_SCOPE`

The mobile redirect URI is `grailbabe://auth/callback` (scheme registered in `app.json`). Add it to the Entra app registration's mobile/desktop platform redirects.

Web bearer tokens flow through `lib/api-client-react`'s `setAuthTokenGetter` (set in `artifacts/web/src/main.tsx`). Mobile uses the same getter, wired via `lib/api.ts` and the `ApiBridge` component in `app/_layout.tsx`. Sign-out on native opens the Entra `end_session_endpoint` via `WebBrowser.openAuthSessionAsync`.

## Where things live

- API routes: `artifacts/api-server/src/routes/*`
- API auth helpers: `artifacts/api-server/src/lib/auth.ts`, `src/lib/users.ts`
- DB schema: `lib/db/src/schema/*` (Drizzle, source of truth)
- API contract: `lib/api-spec/openapi.yaml` → generated client at `lib/api-client-react/src/generated/*`
- Web pages: `artifacts/web/src/pages/*`, layout in `src/components/AppShell.tsx`
- Mobile screens: `artifacts/mobile/app/*` (expo-router file-based routing)

## Architecture decisions

- Demo-data fallback: signed-out users still see populated dashboards. The API treats requests without a valid bearer token as guests and returns curated demo data instead of 401 on listing endpoints. Keep this behavior intact when adding new routes.
- `user_profiles.id` is `text` (not uuid) so it transparently fits both legacy Clerk ids and current Entra GUIDs. Don't change this.
- Single Entra app registration powers all three artifacts; SPAs use auth-code + PKCE, mobile uses native PKCE redirects. There is no resource-server-side app registration — the same client id is the audience.

## Product

GrailBabe is a Pokémon TCG collector tool: vault tracking, grail wishlist, trade marketplace with reputation, in-app messaging, community posts, and a price scanner.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Do not bump `@types/react` / `@types/react-dom` past `~19.1.x` in `pnpm-workspace.yaml`** (catalog or overrides). Mobile (Expo) pins `~19.1.10` and any drift to `^19.2.x` causes pnpm to materialize two physical copies of `@react-navigation/native@7.2.4` (one per peer-variant). Each copy has its own `LinkingContext`, so `expo-router`'s NavigationContainer provides one and `native-stack`'s `useLinkBuilder` consumes the other → web preview crashes with "Couldn't find a LinkingContext context." Verify with `ls node_modules/.pnpm | rg "react-navigation\+native@7"` — exactly one `_react-native@…` line should exist.
- iOS-only modules (`expo-symbols`, `expo-glass-effect`, `expo-router/unstable-native-tabs`) must be `require()`'d lazily inside an `if (Platform.OS === "ios")` branch in `artifacts/mobile/app/(tabs)/_layout.tsx`, otherwise web bundling pulls them in and fails.
- The Entra authority uses `*.ciamlogin.com`, **not** `*.b2clogin.com`. External ID is a different product from the legacy B2C; B2C-shaped policy URLs will fail with `AADSTS900144` / unknown tenant.
- After adding any new mobile redirect URI or rotating the Entra client secret, restart the mobile workflow — the discovery doc is cached on first load.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
