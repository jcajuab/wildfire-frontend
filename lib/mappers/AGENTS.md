<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# mappers

## Purpose

Data transformation functions that convert backend API responses into frontend-friendly model shapes. Centralizes the mapping logic to keep components clean.

## Key Files

| File                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `audit-log-mapper.ts`     | Audit log API response to frontend log entry       |
| `content-mapper.ts`       | Content API response to frontend content model     |
| `display-mapper.ts`       | Display API response to frontend Display model     |
| `display-mapper.test.ts`  | Display mapper unit tests                          |
| `playlist-mapper.ts`      | Playlist API response to frontend playlist model   |
| `schedule-mapper.ts`      | Schedule API response to frontend schedule model   |
| `schedule-mapper.test.ts` | Schedule mapper unit tests                         |

## For AI Agents

### Working In This Directory

- Mappers are pure functions -- no side effects, easily testable
- Update mappers when backend API response shape changes
- Used by RTK Query `transformResponse` or in component code
- Test files collocated as `*.test.ts` next to source

<!-- MANUAL: -->
