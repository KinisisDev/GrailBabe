# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Do not bump `@types/react` / `@types/react-dom` past `~19.1.x` in `pnpm-workspace.yaml`** (catalog or overrides). Mobile (Expo) pins `~19.1.10` and any drift to `^19.2.x` causes pnpm to materialize two physical copies of `@react-navigation/native@7.2.4` (one per peer-variant). Each copy has its own `LinkingContext`, so `expo-router`'s NavigationContainer provides one and `native-stack`'s `useLinkBuilder` consumes the other → web preview crashes with "Couldn't find a LinkingContext context." Verify with `ls node_modules/.pnpm | rg "react-navigation\+native@7"` — exactly one `_react-native@…` line should exist.
- iOS-only modules (`expo-symbols`, `expo-glass-effect`, `expo-router/unstable-native-tabs`) must be `require()`'d lazily inside an `if (Platform.OS === "ios")` branch in `artifacts/mobile/app/(tabs)/_layout.tsx`, otherwise web bundling pulls them in and fails.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
