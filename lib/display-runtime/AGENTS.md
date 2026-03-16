<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-16 -->

# display-runtime

## Purpose

Display content player runtime. Runs on public display pages to render scheduled content — handles playlist playback, flash message tickers, PDF rendering, overflow timing, and SSE event streaming for real-time updates.

## Key Files

| File                   | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `player-controller.ts` | Main playback controller — advances through playlist items |
| `flash-ticker.ts`      | Flash message ticker with scrolling animation timing       |
| `overflow-timing.ts`   | Content overflow detection and timing adjustments          |
| `pdf-renderer.tsx`     | PDF page rendering component using pdfjs-dist              |
| `sse-client.ts`        | Server-Sent Events client for real-time display updates    |

## For AI Agents

### Working In This Directory

- This code runs on public display devices, not in the admin dashboard
- Performance is critical — displays run 24/7, often on low-power hardware
- SSE client maintains persistent connection to backend for schedule/content changes
- Player controller manages item transitions, duration timing, and looping

<!-- MANUAL: -->
