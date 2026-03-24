<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-24 -->

# app

## Purpose

Next.js App Router directory. Contains all pages, layouts, and API routes. Organized by route groups: `(auth)` for login/invite flows, `admin` for the dashboard, `displays` for public display rendering, and `api` for backend-proxied routes.

## Key Files

| File           | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `layout.tsx`   | Root layout -- providers (theme, auth), toaster, skip-nav, a11y   |
| `globals.css`  | Tailwind CSS v4 styles, CSS variables, component themes           |
| `page.tsx`     | Home page (redirects to admin or login)                           |
| `not-found.tsx`| Custom 404 page                                                  |
| `robots.ts`    | Robots.txt generation                                             |
| `icon.svg`     | App favicon                                                       |

## Subdirectories

| Directory       | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `(auth)/`       | Auth route group -- login, accept-invite pages             |
| `admin/`        | Admin dashboard with nested routes (see `admin/AGENTS.md`) |
| `api/`          | API routes (AI chat proxy)                                 |
| `displays/`     | Public display pages -- renders scheduled content by slug  |
| `unauthorized/` | 403 unauthorized page                                      |

## For AI Agents

### Working In This Directory

- Next.js App Router conventions: `page.tsx` for pages, `layout.tsx` for layouts
- Route groups `(auth)` use parentheses -- no URL segment
- Pages are Server Components by default -- add `"use client"` for interactivity
- Collocated `_components/` and `_hooks/` folders use underscore prefix (private to route)
- Admin pages use `admin/(dashboard)/layout.tsx` for shared sidebar layout
- Root layout wraps with ThemeProvider and AuthProvider (NOT StoreProvider -- that is in AppLayout)

### Common Patterns

- Page components are thin -- logic lives in `use-*-page.ts` hooks
- Each admin page has a collocated controller hook pattern
- API routes in `api/` proxy to the backend server

<!-- MANUAL: -->
