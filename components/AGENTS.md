<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# components

## Purpose

Reusable React components organized by feature domain. Each feature subdirectory contains components specific to that domain (content, displays, playlists, etc.). The `ui/` directory holds shadcn/ui primitives. The `common/` directory has shared cross-feature components.

## Subdirectories

| Directory      | Purpose                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| `ui/`          | shadcn/ui primitives -- button, dialog, table, etc. (see `ui/AGENTS.md`)   |
| `common/`      | Cross-feature components -- permissions guard, pagination, search, dialogs |
| `ai/`          | AI chat interface -- chat bubble, chat panel, slash command menu           |
| `ai-elements/` | AI UI building blocks -- conversation, message, prompt input, code blocks  |
| `content/`     | Content management -- cards, grid, create dialog, TipTap editor, filters   |
| `displays/`    | Display management -- cards, grid, registration, groups, preview           |
| `playlists/`   | Playlist management -- cards, grid, create/edit forms, sortable items      |
| `schedules/`   | Schedule management -- calendar grid, resource views, create/edit dialogs  |
| `roles/`       | Role management -- role form, roles table                                  |
| `users/`       | User management -- invite dialog, edit dialog, actions menu, table         |
| `logs/`        | Audit log -- table, metadata dialog                                        |
| `layout/`      | App layout -- sidebar, header, dashboard page wrapper, auth guard          |

## Key Files

| File                            | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `theme-provider.tsx`            | next-themes provider for dark/light mode        |
| `dev-accessibility-checker.tsx` | Development-only axe-core accessibility checker |

## For AI Agents

### Working In This Directory

- Feature components import from `@/components/ui/` for primitives
- Components use `"use client"` directive when they need interactivity
- Styling via Tailwind CSS utility classes -- no CSS modules
- Icons from `@tabler/icons-react` for feature icons, `lucide-react` used by shadcn/ui internals
- No barrel exports (`index.ts`) -- import components directly by file path

### Testing Requirements

- Component tests use `@testing-library/react` with jsdom
- Test files collocated as `*.test.tsx` next to source
- Mock RTK Query hooks for API-dependent components

### Common Patterns

- Props interfaces defined inline or in same file
- `class-variance-authority` (cva) for component variants
- `clsx` + `tailwind-merge` via `cn()` utility for conditional classes
- Dialog/sheet components follow open/close state pattern from parent

<!-- MANUAL: -->
