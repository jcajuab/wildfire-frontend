<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# lib

## Purpose

Utility libraries, API layer, Redux store, data mappers, and domain-specific helpers. Central location for non-component code shared across the application.

## Key Files

| File                             | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `store.ts`                       | Redux store configuration with RTK Query middleware                  |
| `StoreProvider.tsx`              | Redux Provider wrapper component                                     |
| `hooks.ts`                       | Typed Redux hooks (`useAppSelector`, `useAppDispatch`)               |
| `api-client.ts`                  | Base API client configuration                                        |
| `utils.ts`                       | General utilities (`cn()` for tailwind class merging)                |
| `auth-events.ts`                 | Auth event bus (login/logout/token refresh)                          |
| `design-permissions.ts`          | Permission constants for UI feature gating                           |
| `permissions.ts`                 | Permission checking utilities                                        |
| `route-permissions.ts`           | Route-level permission mappings                                      |
| `formatters.ts`                  | Date, number, and display formatting utilities                       |
| `format-permission.ts`           | Permission label, readable label, and tooltip description formatters |
| `slash-commands.ts`              | AI chat slash command definitions                                    |
| `playlist-paths.ts`              | Playlist URL path helpers                                            |
| `role-paths.ts`                  | Role admin URL path constants and helpers                            |
| `display-output.ts`              | Display output resolution utilities                                  |
| `audit-resource-types.ts`        | Audit log resource type constants, labels, and filter helpers        |
| `content-thumbnail-preview.ts`   | Content thumbnail text extraction and HTML sanitization utilities    |
| `display-group-normalization.ts` | Display group name whitespace normalization and deduplication        |
| `rich-text-preview-classes.ts`   | Shared Tailwind classes for rich text HTML preview rendering         |
| `invite.ts`                      | Invite link display placeholder constant                             |

## Subdirectories

| Directory           | Purpose                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `api/`              | RTK Query API slices -- one per domain module (see `api/AGENTS.md`)                     |
| `ai/`               | AI provider configuration                                                               |
| `crypto/`           | Client-side cryptography (display key management, request signing)                      |
| `display-api/`      | Display-facing API client (used by public display pages)                                |
| `display-identity/` | Display fingerprinting and registration storage                                         |
| `display-runtime/`  | Display content player -- playback, flash ticker, SSE (see `display-runtime/AGENTS.md`) |
| `mappers/`          | API response to frontend model data mappers (see `mappers/AGENTS.md`)                   |
| `schedules/`        | Schedule/calendar computation utilities                                                 |

## For AI Agents

### Working In This Directory

- `api/` contains all RTK Query endpoints -- add new API calls here
- Data mappers in `mappers/` transform backend responses to frontend types
- Display runtime code in `display-runtime/` runs on public display pages (not admin)
- Test files collocated as `*.test.ts` next to source
- Many utility modules have comprehensive test coverage

### Common Patterns

- RTK Query for all server state (no manual fetch/useState for API data)
- `paginated-query-factory.ts` generates paginated list endpoints
- API error handling via `get-api-error-message.ts`

<!-- MANUAL: -->
