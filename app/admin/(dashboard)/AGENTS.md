<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# (dashboard)

## Purpose

Dashboard route group with shared sidebar layout. Contains all admin management pages: content, displays, playlists, schedules, roles, users, audit logs, and settings. The parentheses make this a route group (no URL segment).

## Key Files

| File         | Description                                       |
| ------------ | ------------------------------------------------- |
| `layout.tsx` | Dashboard layout -- wraps children with AppLayout |
| `loading.tsx`| Dashboard loading skeleton                        |

## Subdirectories

| Directory    | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `content/`   | Content management page with CRUD dialogs, filters, and job monitoring |
| `displays/`  | Display management page with grid view and group management            |
| `playlists/` | Playlist pages -- list, create, edit with drag-and-drop item ordering  |
| `schedules/` | Schedule management page with calendar grid views                      |
| `roles/`     | Role management page with permission assignment                        |
| `users/`     | User management page with invitations and role assignment              |
| `logs/`      | Audit log page with filters, pagination, and CSV export                |
| `settings/`  | User settings -- profile, password, avatar, AI credentials             |

## For AI Agents

### Working In This Directory

- Each page directory contains: `page.tsx` (component) + `_hooks/use-*-page.ts` (controller hook)
- Some pages have `_hooks/` or `_components/` for collocated private modules
- All pages share the AppLayout from `layout.tsx`
- Page-level logic (filters, dialogs, CRUD handlers) lives in hooks, not page components

### Common Patterns

- Controller hook pattern: `use-*-page.ts` returns all state + handlers the page needs
- Pages compose feature components from `@/components/<feature>/`
- Permission gating via `<Can>` component or `useCan()` hook
- Each page has `layout.tsx` (metadata) and `loading.tsx` (skeleton)

<!-- MANUAL: -->
