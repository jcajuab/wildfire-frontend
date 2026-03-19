<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-19 -->

# api

## Purpose

RTK Query API layer. Contains all API endpoint definitions organized by domain module. Handles data fetching, caching, optimistic updates, and cache invalidation. Each file defines endpoints for one backend API area.

## Key Files

| File                         | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `base-query.ts`              | Custom base query with auth token injection and refresh handling |
| `contracts.ts`               | Shared API request/response type contracts                       |
| `audit-api.ts`               | Audit log endpoints (list, export)                               |
| `auth-api.ts`                | Authentication endpoints (login, logout, session, profile)       |
| `content-api.ts`             | Content CRUD endpoints                                           |
| `displays-api.ts`            | Display management endpoints                                     |
| `playlists-api.ts`           | Playlist CRUD and item management endpoints                      |
| `rbac-api.ts`                | User, role, permission endpoints                                 |
| `schedules-api.ts`           | Schedule CRUD endpoints                                          |
| `display-events.ts`          | Display SSE event subscription                                   |
| `paginated-query-factory.ts` | Factory for creating paginated list endpoints                    |
| `pagination-collector.ts`    | Utility for collecting all pages of paginated data               |
| `provide-tags.ts`            | RTK Query cache tag helpers                                      |
| `proxy.ts`                   | API proxy configuration                                          |
| `response-transformers.ts`   | Response transformation utilities                                |
| `get-api-error-message.ts`   | Error message extraction from API responses                      |
| `auth-refresh.helpers.ts`    | Token refresh logic and retry queue                              |
| `backend-url.ts`             | Backend API URL resolution                                       |

## For AI Agents

### Working In This Directory

- All API calls go through RTK Query — no manual `fetch()` in components
- `base-query.ts` handles auth token injection and automatic refresh on 401
- Cache tags follow pattern: `{ type: 'Entity', id }` for targeted invalidation
- Paginated endpoints use `paginated-query-factory.ts` for consistent behavior
- Add new endpoints to the appropriate `*-api.ts` file, not a new file
- Test files collocated as `*.test.ts` — cover base-query, contracts, display-events, display-registration, pagination-guards, rbac-pagination

### Common Patterns

- Endpoints are defined with `builder.query()` or `builder.mutation()`
- Mutations invalidate relevant cache tags to trigger refetch
- `providesTags` / `invalidatesTags` for automatic cache management

<!-- MANUAL: -->
