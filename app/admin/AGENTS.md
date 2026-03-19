<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-19 -->

# admin

## Purpose

Admin section of the application. Contains the dashboard layout with sidebar navigation and all management pages: content, displays, playlists, schedules, roles, users, logs, and settings.

## Key Files

| File                         | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `layout.tsx`                 | Admin layout — auth guard wrapper                   |

## Subdirectories

| Directory      | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `(dashboard)/` | Dashboard route group with sidebar layout (see `(dashboard)/AGENTS.md`) |
| `displays/`    | Display registration flow (outside dashboard layout)                    |

## For AI Agents

### Working In This Directory

- Admin pages require authentication — `layout.tsx` wraps with auth guard
- Dashboard pages are nested under `(dashboard)/` with shared sidebar layout
- Display registration (`displays/register/`) has its own layout (no sidebar)

<!-- MANUAL: -->
