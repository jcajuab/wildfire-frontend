<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# Wildfire Frontend

## Purpose

Next.js 16 frontend for the Wildfire digital signage management system. Provides admin dashboard for managing displays, content, playlists, schedules, users/roles, and an AI chat assistant. Also serves public display pages that render scheduled content. Uses React 19, Redux Toolkit (RTK Query), Tailwind CSS v4, and shadcn/ui.

## Key Files

| File                         | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `app/layout.tsx`             | Root layout -- theme provider, auth provider, toaster    |
| `app/globals.css`            | Tailwind CSS v4 global styles and CSS variables          |
| `package.json`               | Dependencies and scripts (pnpm, next, react 19)          |
| `tsconfig.json`              | TypeScript config -- `@/*` path alias to `./*`           |
| `next.config.ts`             | Next.js configuration (standalone output, headers)       |
| `components.json`            | shadcn/ui config -- radix-mira style, tabler icons       |
| `vitest.config.ts`           | Vitest test runner configuration                         |
| `eslint.config.js`           | ESLint config with next, jsx-a11y plugins                |
| `vitest.setup.ts`            | Vitest global test setup (Testing Library, jsdom)        |
| `postcss.config.js`          | PostCSS configuration for Tailwind CSS                   |
| `pnpm-workspace.yaml`        | pnpm workspace definition                                |

## Subdirectories

| Directory     | Purpose                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `app/`        | Next.js App Router -- pages, layouts, and API routes (see `app/AGENTS.md`)  |
| `components/` | Reusable React components organized by feature (see `components/AGENTS.md`) |
| `hooks/`      | Custom React hooks (see `hooks/AGENTS.md`)                                  |
| `lib/`        | Utilities, API client, Redux store, mappers (see `lib/AGENTS.md`)           |
| `context/`    | React context providers (auth) (see `context/AGENTS.md`)                    |
| `types/`      | TypeScript type definitions for domain entities (see `types/AGENTS.md`)     |

## For AI Agents

### Working In This Directory

- Path alias: `@/` maps to `./*` -- use for all imports
- Package manager is **pnpm** (not npm/yarn/bun)
- React 19 with Server Components (RSC) -- `"use client"` directive required for client components
- Tailwind CSS v4 -- no `tailwind.config.ts`, configured via CSS
- shadcn/ui components in `components/ui/` -- add via `pnpm dlx shadcn@latest add <component>`
- Icon library: `@tabler/icons-react` (not lucide for feature icons, lucide used by shadcn)

### Testing Requirements

- `pnpm run format` -- Prettier formatting
- `pnpm run lint` -- ESLint
- `pnpm run test` -- Vitest unit tests
- `pnpm run build` -- Next.js production build
- Testing Library (React) + jsdom for component tests
- Collocated test files (`*.test.ts` / `*.test.tsx` next to source)

### Common Patterns

- Redux Toolkit with RTK Query for API state management
- Feature-based component organization (content, displays, playlists, etc.)
- Page-level hooks (`use-*-page.ts`) encapsulate page logic
- Collocated test files (`*.test.tsx` next to source)

## Dependencies

### External

- `next` 16.x -- React framework with App Router
- `react` 19.x -- UI library
- `@reduxjs/toolkit` -- State management with RTK Query
- `ai` v6 + `@ai-sdk/react` -- AI chat with streaming (Vercel AI SDK v6)
- `@tiptap/*` -- Rich text editor
- `@dnd-kit/*` -- Drag and drop (playlist item reordering)
- `tailwindcss` v4 -- Utility-first CSS
- `radix-ui` -- Headless UI primitives (via shadcn/ui)
- `@base-ui/react` -- Base UI components
- `framer-motion` -- Animations
- `pdfjs-dist` -- PDF rendering for display content
- `shiki` -- Code syntax highlighting
- `streamdown` + `@streamdown/*` -- Streaming markdown rendering (AI chat)
- `use-stick-to-bottom` -- Auto-scroll for chat UI
- `dompurify` -- HTML sanitization
- `sonner` -- Toast notifications

<!-- MANUAL: -->
