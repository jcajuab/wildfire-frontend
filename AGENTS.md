# Development Principles

Single source of truth for workflow, architecture, and coding practices.

## Workflow (required)

1. Tooling first: use the required MCP/doc tools for the technology in scope.
2. Apply skills: use the required skills when building or reviewing UI.
3. Implement with core principles and type safety.
4. Validate before finalizing.

## Required tooling (MCP + docs)

- Next.js 16: start with `mcp__next-devtools__init`. Use DevTools MCP for docs/diagnostics (`mcp__next-devtools__nextjs_docs`, `mcp__next-devtools__nextjs_index`, `mcp__next-devtools__nextjs_call`). Prefer MCP guidance over memory.
- Tailwind CSS v4: use Context7 (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`).
- AI SDK v6 + AI Elements: always use Context7 (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`).
- Redux Toolkit + RTK Query: always use Context7 (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`).
- shadcn: always use the shadcn MCP tools when adding or referencing shadcn components.

## Required skills

- Building: always include `vercel-react-best-practices` and `vercel-composition-patterns`.
- Reviewing UI/UX: always use `web-design-guidelines`.

## Core principles

- DRY: centralize validation, errors, logging, pagination, auth checks.
- SOLID: SRP (one reason to change), OCP (extend via composition/interfaces), LSP (interchangeable implementations), ISP (small interfaces), DIP (depend on abstractions).
- Clean Architecture: keep clear boundaries; dependencies point inward; separate domain, application, and infrastructure.
- Observability: log `{ route, requestId, userId, sessionId, fileId }`; log entry/exit + timing, external calls, business-critical events; never log sensitive data.

## Type safety and style

- TypeScript strict; no `any` (use `unknown`).
- Explicit param/return types.
- Prefer `interface` for objects; `type` for unions/intersections.
- Use `readonly` for immutability.
- Comments explain why, not what.

## Validation (required)

- Run `pnpm run lint`, `pnpm run format`, and `pnpm run build` before finalizing changes.
- build = blocker; lint = medium; format = low.

## Auth (login integration)

- Login is integrated with the backend via `POST /auth/login`; auth now uses **httpOnly cookie-first sessions** and frontend requests must send credentials (`credentials: "include"`).
- Frontend session state (`wildfire_session`) stores user/permissions/expiry for UI hydration only; it is not the source of truth for auth tokens.
- Password recovery is available via `POST /auth/forgot-password` and `POST /auth/reset-password`; expose `/forgot-password` and `/reset-password` UX in auth flows.
- Handle backend `429` auth responses with explicit lockout/rate-limit messaging (not generic errors).
- Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`, no trailing slash) in `.env.local`; see `.env.example`. Restart the dev server after changing env.
- For local login the backend at `localhost:3001` must allow the frontend origin (e.g. `http://localhost:3000`) in CORS so the browser allows the `POST /auth/login` request.
