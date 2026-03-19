<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-19 -->

# hooks

## Purpose

Custom React hooks shared across the application. Provides reusable stateful logic for AI chat, permissions, global emergency state, and UI utilities.

## Key Files

| File                      | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `use-ai-chat.ts`          | AI chat hook — wraps `@ai-sdk/react` useChat with custom config         |
| `use-ai-credentials.ts`   | AI provider credential management hook                                  |
| `use-can.ts`              | Permission check hook — checks if current user has specific permissions |
| `use-global-emergency.ts` | Global emergency mode toggle hook                                       |
| `use-mobile.ts`           | Mobile viewport detection hook                                          |
| `use-mounted.ts`          | SSR-safe mounted state hook                                             |
| `use-query-state.ts`      | URL query string state management hook                                  |

## For AI Agents

### Working In This Directory

- Hooks follow React conventions: `use-` prefix, return stateful values
- `use-can.ts` is the primary authorization hook — used throughout admin pages
- Keep hooks pure and composable — no side effects beyond React state

<!-- MANUAL: -->
