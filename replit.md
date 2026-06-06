# TeamFlow

A full-stack team workflow management app for software teams. Tracks tasks with work-division percentages, a health system (completing tasks on time = +5 hp, late = -10 hp), per-member performance scores, GitHub integration (auto-complete programming tasks via commits), contribution charts, documentation/research/programming task types, monthly team roadmap, and role-based access (leader vs member).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — token hashing salt

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API endpoints
- `lib/db/src/schema/` — Drizzle ORM schema (users, projects, tasks, health_events, roadmap_items, activity_log)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/teamflow/src/pages/` — all frontend pages

## Architecture decisions

- **Contract-first API**: OpenAPI spec → codegen → typed hooks + Zod validators. Never edit generated files.
- **In-memory sessions**: Bearer token → userId map (not persistent across server restarts). Sessions are SHA256 hashed with SESSION_SECRET.
- **Health system**: +5 hp on-time completion, -10 hp late completion, capped 0-100. Performance score = (onTime/meaningful tasks) * 100, recalculated on task completion.
- **Global auth injection**: `setAuthTokenGetter(() => localStorage.getItem("teamflow_token"))` in main.tsx injects Bearer token into all API calls automatically.
- **GitHub webhook**: POST /api/github/webhook auto-completes programming tasks when commits mention task keywords or task IDs.

## Product

- **Dashboard**: Health Points, Performance Score, Active/Overdue Tasks, Upcoming Deadlines, Recent Activity
- **Projects**: Create projects, link GitHub repos, view task boards with workload breakdown
- **Tasks**: Create/assign tasks (programming/docs/research), set workload %, due dates, complete with health impact
- **Team**: Performance leaderboard, per-member health + stats
- **Roadmap**: Monthly view of planned/in-progress/achieved goals

## Test Accounts (seeded)

- `alex@teamflow.dev` / `password123` — Team Leader (Alex Rivera)
- `jordan@teamflow.dev` / `password123` — Member (Jordan Smith)
- `taylor@teamflow.dev` / `password123` — Member (Taylor Chen)
- `morgan@teamflow.dev` / `password123` — Member (Morgan Lee)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Sessions are in-memory: all tokens expire when the API server restarts. Users must re-login.
- Run `pnpm run typecheck:libs` after any schema/lib change before artifact typecheck.
- The `lib/api-zod/src/index.ts` only exports from `./generated/api` (not types) to avoid TS2308 collisions.
- OpenAPI path+query param conflicts: use path segments for `period` params instead of query params.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
