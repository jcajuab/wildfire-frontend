<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# types

## Purpose

TypeScript type definitions for domain entities used across the frontend. Each file defines types for one domain module, matching the backend API response shapes.

## Key Files

| File            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `auth.ts`       | Auth types -- user session, login request/response    |
| `common.ts`     | Shared types -- paginated response, API error         |
| `content.ts`    | Content entity types (text, flash, image, video, PDF) |
| `display.ts`    | Display entity and group types                        |
| `invitation.ts` | User invitation types                                 |
| `log.ts`        | Audit log entry types                                 |
| `permission.ts` | Permission and authorization types                    |
| `playlist.ts`   | Playlist and playlist item types                      |
| `role.ts`       | Role entity types                                     |
| `schedule.ts`   | Schedule entity types                                 |
| `user.ts`       | User entity types                                     |

## For AI Agents

### Working In This Directory

- Types must match backend API contracts -- update when backend changes
- These are frontend-facing types, not 1:1 copies of DB schemas
- Mappers in `lib/mappers/` transform API responses into these types

<!-- MANUAL: -->
