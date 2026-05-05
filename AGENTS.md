# Frontend Agent Guide

Scope: everything under `frontend/`. This is a Next.js 16 App Router app with `cacheComponents: true`, React 19, TypeScript, Tailwind CSS v4, shadcn/ui `radix-mira`, Tabler icons, RTK Query, Vitest, and pnpm.

## Mandatory Skill Gates

Before planning or editing, load and apply every matching skill:

- `$next-best-practices`: any route, layout, metadata, route handler, RSC/client boundary, async `params`/`searchParams`, image, font, script, error, hydration, Suspense, or bundling work.
- `$next-cache-components`: any server data, cache, revalidation, PPR, `"use cache"`, `cacheLife`, `cacheTag`, `updateTag`, `revalidateTag`, router cache, stale time, or dynamic/static rendering work.
- `$vercel-composition-patterns`: reusable component APIs, shared components, provider/context design, compound components, render props, or boolean prop growth.
- `$vercel-react-best-practices`: React components, pages, data fetching, performance, bundle size, effects, re-render behavior, event listeners, or expensive UI.
- `$web-design-guidelines`: UI layout, visual design, accessibility, responsive behavior, forms, tables, dialogs, interaction states, or UI reviews. For reviews, fetch the latest guideline source required by the skill.

If a matching skill is skipped, state why before editing. In the final response, list the skills used.

## Commands

- Run from `frontend/`.
- Use `pnpm`, never npm/yarn/bun.
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`
- Format: `pnpm format`
- Analyze: `pnpm analyze`

Verify with the narrowest relevant tests plus `pnpm lint`. Run `pnpm build` for route, server component, cache, config, metadata, or App Router changes.

## Structure

- `app/`: routes, layouts, route handlers, server actions, route loading/error/not-found UI.
- `components/ui/`: shadcn primitives. Do not rewrite casually.
- `components/*`: feature and shared UI.
- `hooks/`: shared client hooks.
- `lib/api/`: client API slices and RTK Query helpers.
- `lib/server/`: server-only helpers. Never import from Client Components.
- `types/`: shared frontend types.
- Use `@/*` imports.

## Next.js Rules

- Server Components are the default. Add `"use client"` only for state, effects, browser APIs, event handlers, RTK Query hooks, drag/drop, editors, or imperative DOM.
- Keep `page.tsx` thin: auth, permission checks, server fetches, cache seeding, and composition. Put interaction in `*-page-client.tsx`, hooks, or feature components.
- Treat `params` and `searchParams` as promises in App Router pages/layouts.
- Use `redirect()` and `notFound()` for server-side route decisions.
- Client hooks that trigger CSR bailout, such as `useSearchParams`, must be inside a Client Component and covered by an appropriate Suspense boundary when required by Next.
- Use route `loading.tsx` for route data loading; use local skeletons/spinners for client-only loading.
- Prefer Node.js runtime unless a route has a proven Edge requirement.

## Cache Components

- `cacheComponents` is enabled. Preserve it unless the build proves a blocker and the user approves a rollback.
- Use `"use cache"` only for deterministic async work that does not access request-time APIs directly.
- Do not call `cookies()`, `headers()`, uncached `searchParams`, `Date.now()`, or `Math.random()` inside cached scopes. Read runtime data outside and pass serializable values as arguments, or keep the component dynamic behind Suspense.
- Tag cached server data with `cacheTag()` and set a deliberate `cacheLife()` profile when using Cache Components APIs.
- Use `updateTag()` when the same request needs fresh data; use `revalidateTag()` for stale-while-revalidate.
- Existing admin server fetches should continue using `serverFetchJson` with narrow `next.tags`/`revalidate` unless migrating that specific path to Cache Components.
- Keep cache tags narrow. Never invalidate unrelated admin data.

## Data and Auth

- Use `getServerSession()` for server auth and `sessionHasPermission()` for server permission checks.
- Redirect unauthenticated users to `/login?redirectTo=...`; redirect unauthorized users to `/unauthorized`.
- Client data belongs in existing RTK Query slices under `lib/api/*`; do not add one-off fetches in components.
- Seed RTK Query from server-prefetched data with a tiny client seeder using `api.util.upsertQueryData`.
- Use existing `lib/*-search-params.ts` helpers for URL filters.
- Start independent async work early and await with `Promise.all`.

## Components

- Use explicit prop interfaces for non-trivial components; prefer `readonly`.
- Return `ReactElement` for rendered components and `null` for no-render seeders when consistent locally.
- Avoid boolean prop proliferation. Prefer composition, explicit variants, compound components, or provider-owned state.
- Keep state local unless siblings need it. Derive simple state during render, not effects.
- Use `useMemo`/`useCallback` only for stable dependencies, memoized children, subscriptions, or expensive work.
- Do not define components inside components.
- Avoid passing large server payloads into Client Components.

## UI and Styling

- Use existing shadcn primitives before adding new ones.
- Use `@tabler/icons-react`; no new icon libraries.
- Use `cn()` and semantic tokens: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-muted`, `text-destructive`, `text-primary`, `bg-sidebar`.
- Avoid hard-coded colors unless introducing a reusable semantic token in `app/globals.css`.
- Preserve the compact admin style: dense, scannable, restrained, task-focused.
- Do not nest cards inside cards. Do not use cards as generic page sections.
- Stabilize dimensions for toolbars, icon buttons, tables, cards, grids, and loading states.
- Text must not overflow or overlap on mobile or desktop.
- Respect dark mode, `[data-force-light]`, focus-visible styles, and reduced motion.
- Icon-only buttons need `aria-label`; decorative icons need `aria-hidden="true"`.

## Forms, Tables, and Accessibility

- Use existing dialog/form/table patterns before adding abstractions.
- Inputs need labels or reliable accessible names.
- Use accessible primitives for dialogs, menus, popovers, sheets, tabs, and tooltips.
- Preserve focus management and keyboard access.
- Use confirmation dialogs and clear toasts for destructive actions.
- Gate UI with `Can` or route/page guards, not scattered ad hoc checks.
- Empty, loading, and error states are required for tables and grids.

## Testing and Quality

- Tests use Vitest, jsdom, Testing Library, and `vitest.setup.ts`.
- Place tests next to code as `*.test.ts` or `*.test.tsx`.
- Prefer user-facing assertions over implementation details.
- Add/update tests for hooks, search params, permissions, cache updates, forms, dialogs, destructive actions, and bug fixes.
- Keep tests deterministic: no uncontrolled timers, dates, random IDs, or network.
- Keep TypeScript strict. Avoid `any`; prefer `unknown`, local types, and discriminated unions.
- Avoid non-null assertions unless a guard makes the invariant obvious.
- Let Prettier own formatting.

## Change Discipline

- Keep edits scoped.
- Do not introduce new state libraries, form libraries, icon libraries, CSS frameworks, or component kits without approval.
- Do not change shadcn primitives unless fixing a shared primitive bug or adding a requested primitive.
- Final response must include changed files, verification run, skipped verification with reason, and required skills used.
