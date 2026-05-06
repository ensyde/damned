# Copilot Instructions for Damned

## Project Overview

**Damned** is a community platform (forum + downloads + private messaging + notifications) built as a **Turborepo monorepo**.

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo (`turbo.json`) |
| API | Node.js 20, Express 4, TypeScript, `apps/api` |
| Web | Next.js 14 (App Router), Tailwind CSS, TypeScript, `apps/web` |
| Database | PostgreSQL 16 via Prisma ORM, `packages/db` |
| Cache / Realtime | Redis 7, Socket.IO |
| Auth | JWT (access + refresh tokens), bcryptjs |
| File Storage | AWS S3 (presigned URLs via `@aws-sdk`) |
| Shared utils | `packages/shared` — validators, types shared across apps |

## Directory Layout

```
apps/
  api/          Express REST + Socket.IO server
    src/
      routes/   One file per resource (auth, forum, downloads, users, …)
      services/ Business logic (email, notifications, …)
      middleware/
      utils/
      config/
  web/          Next.js App Router frontend
    src/app/    Route segments (forum, downloads, messages, profile, …)
    src/components/
    src/lib/
packages/
  db/           Prisma schema + migrations + seed
    prisma/schema.prisma
  shared/       Shared TypeScript types and validators
```

## Coding Conventions

### General
- TypeScript strict mode everywhere; never use `any` unless absolutely unavoidable.
- Prefer `async/await` over `.then()` chains.
- Use named exports; avoid default exports unless required by a framework.
- File names: `camelCase.ts` for modules, `kebab-case` for Next.js route segments.

### API (`apps/api`)
- Every route file exports a single Express `Router` instance.
- Use `express-validator` (`body()`, `param()`, `query()`) for input validation; call `validationResult()` at the top of each handler.
- Use `express-async-handler` to wrap async route handlers.
- Use `AuthRequest` (from `middleware/auth`) for routes that require authentication.
- Rate-limit auth/sensitive endpoints using `middleware/rateLimit`.
- Return consistent JSON shape: `{ success: true, data: … }` on success; `{ success: false, message: "…", errors?: […] }` on failure.
- Log with `winston` (imported from `src/utils/logger.ts`). Never use `console.log` in production paths.
- All Prisma queries go through the shared `prisma` singleton from `src/config/prisma`.
- Soft-delete records by setting `deletedAt`; filter them out with `deletedAt: null` in queries.

### Database (`packages/db`)
- Schema lives in `packages/db/prisma/schema.prisma`.
- Every model uses `cuid()` as the primary key (`@id @default(cuid())`).
- Every model maps to a `snake_case` table name via `@@map("table_name")`.
- Use `@@unique` for multi-column unique constraints.
- Add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` to every persisted model.
- Add new migrations with `npm run db:migrate` (runs `prisma migrate dev`).
- After schema changes always regenerate the client with `npm run db:generate`.

### Web (`apps/web`)
- Use the Next.js **App Router** exclusively; no `pages/` directory.
- Server Components by default; only add `"use client"` when you need browser APIs or React state/effects.
- Fetch data in Server Components using `fetch()` or direct API calls; pass serialisable props to Client Components.
- Tailwind CSS for all styling — no CSS modules or inline styles unless necessary.
- Use the design tokens already defined in `tailwind.config.js` (primary, accent, surface, bg colors).
- Keep component files small; extract reusable pieces to `src/components/`.

### Shared (`packages/shared`)
- Pure TypeScript — no Node.js or browser globals.
- Export validators (`isValidUsername`, `isValidEmail`, …) and shared DTO types.
- Import in both `apps/api` and `apps/web` as `@damned/shared`.

## Commands

```bash
# Root (Turborepo)
npm run dev          # Start all apps in parallel
npm run build        # Build all packages and apps
npm run lint         # ESLint across all workspaces
npm run typecheck    # tsc --noEmit across all workspaces
npm run test         # Jest across all workspaces

# Database
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:seed      # prisma db seed
```

## Testing

- Tests live alongside source files or in `__tests__/` directories.
- Use Jest + ts-jest; configuration in `jest.config.js` per package.
- Test business logic in services; integration-test routes against a real PostgreSQL + Redis instance (see CI config).
- Do not mock Prisma in integration tests — use a test database (`damned_test`).

## Environment Variables

See `.env.example` at the repo root. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `AWS_*` — S3 credentials
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` — consumed by the Next.js app
