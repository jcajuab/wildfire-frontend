<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# context

## Purpose

React context providers for cross-cutting application state that doesn't belong in Redux.

## Key Files

| File                    | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `auth-context.tsx`      | Auth context -- current user, permissions, login/logout state |
| `auth-context.test.tsx` | Auth context unit tests                                       |

## For AI Agents

### Working In This Directory

- Auth context provides `useAuth()` hook for accessing current user and permissions
- Prefer Redux (RTK Query) for server state -- use context only for truly global client state

<!-- MANUAL: -->
