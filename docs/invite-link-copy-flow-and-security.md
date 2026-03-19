# Invite Link Copy Flow and Security Analysis

This document describes the full flow for copying invitation links, why the current approach is secure, and where issues might still appear.

---

## Is It Secure?

**Yes, for the threat model we addressed.** The implementation:

- **Never renders the real invite URL in the DOM** — only the literal placeholder `"/accept-invite?..."` is shown. The token/query params are not in HTML, accessibility tree, or screenshot-friendly markup.
- **Clipboard write is in the same user gesture** — Copy runs synchronously in the click handler (no `await` before `writeText`), so the browser allows clipboard access and we avoid `NotAllowedError`.
- **Two-step flow** — The URL is fetched (Get link) and stored in React state, then copied only when the user clicks Copy. The real URL exists only in JavaScript memory and in the clipboard after an explicit Copy action.

**Remaining caveats** (see "Where Issues Might Appear" below): the URL still lives in JS memory and in the clipboard; backend and transport security are unchanged.

**Backend / credentials:** Invited users are created and stored only in the application database (not in htshadow). The htshadow file is a separate, read-only source used for DCISM users; Wildfire never writes to it.

---

## Full Flow (UML-Style)

### 1. Component and dependency overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVITE LINK COPY FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐       │
│  │ PendingInvitationsTable      │    │ InviteUsersDialog             │       │
│  │ (pending-invitations-        │    │ (invite-users-dialog.tsx)     │       │
│  │  table.tsx)                  │    │                              │       │
│  │                              │    │  ┌────────────────────────┐  │       │
│  │  ┌────────────────────────┐  │    │  │ InviteLinkActions      │  │       │
│  │  │ InviteUrlCell          │  │    │  │ - revealedUrl (state)  │  │       │
│  │  │ - revealedUrl (state)  │  │    │  │ - handleGetLink()      │  │       │
│  │  │ - handleGetLink()       │  │    │  │ - handleCopy()         │  │       │
│  │  │ - handleCopy()          │  │    │  └───────────┬──────────┘  │       │
│  │  └───────────┬────────────┘  │    │              │              │       │
│  └──────────────┼───────────────┘    └──────────────┼──────────────┘       │
│                 │                                   │                       │
│                 │  imports                          │  imports              │
│                 ▼                                   ▼                       │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐       │
│  │ lib/invite.ts               │    │ lib/api-client.ts            │       │
│  │ INVITE_LINK_DISPLAY_         │    │ revealInviteLink(id)         │       │
│  │   PLACEHOLDER               │    │   → POST .../reveal-link     │       │
│  └──────────────────────────────┘    └──────────────┬───────────────┘       │
│                 │                                   │                       │
│                 │  (display only)                  │  (fetch URL)          │
│                 ▼                                   ▼                       │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐       │
│  │ DOM: placeholder text        │    │ Backend: auth/invitations/    │       │
│  │ "/accept-invite?..."        │    │   :id/reveal-link             │       │
│  └──────────────────────────────┘    └──────────────────────────────┘       │
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │ navigator.clipboard          │  ← used only in handleCopy() with         │
│  │   .writeText(revealedUrl)   │    revealedUrl from state (no DOM)        │
│  └──────────────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Sequence diagram — Pending invitations table (InviteUrlCell)

```mermaid
sequenceDiagram
  participant User
  participant InviteUrlCell
  participant revealInviteLink
  participant Backend
  participant Clipboard

  Note over User,Clipboard: Step 1 — Get link (user gesture #1)
  User->>InviteUrlCell: click "Get link"
  InviteUrlCell->>InviteUrlCell: handleGetLink()
  InviteUrlCell->>revealInviteLink: revealInviteLink(invitationId)
  revealInviteLink->>Backend: POST /auth/invitations/:id/reveal-link
  Backend-->>revealInviteLink: { inviteUrl }
  revealInviteLink-->>InviteUrlCell: inviteUrl
  InviteUrlCell->>InviteUrlCell: setRevealedUrl(inviteUrl)
  Note over InviteUrlCell: URL in state only; DOM still shows INVITE_LINK_DISPLAY_PLACEHOLDER

  Note over User,Clipboard: Step 2 — Copy (user gesture #2)
  User->>InviteUrlCell: click "Copy"
  InviteUrlCell->>InviteUrlCell: handleCopy()
  InviteUrlCell->>Clipboard: navigator.clipboard.writeText(revealedUrl)
  Note over InviteUrlCell,Clipboard: Same user activation as click — allowed
  Clipboard-->>InviteUrlCell: success
  InviteUrlCell->>InviteUrlCell: setCopied(true); setTimeout(..., 2000)
```

### 3. Sequence diagram — Invitation Created modal (InviteLinkActions)

```mermaid
sequenceDiagram
  participant User
  participant InviteLinkActions
  participant revealInviteLink
  participant Backend
  participant Clipboard

  Note over User,Clipboard: Step 1 — Get link
  User->>InviteLinkActions: click "Get link"
  InviteLinkActions->>InviteLinkActions: handleGetLink()
  InviteLinkActions->>revealInviteLink: revealInviteLink(invitationId)
  revealInviteLink->>Backend: POST /auth/invitations/:id/reveal-link
  Backend-->>revealInviteLink: { inviteUrl }
  revealInviteLink-->>InviteLinkActions: inviteUrl
  InviteLinkActions->>InviteLinkActions: setRevealedUrl(inviteUrl)

  Note over User,Clipboard: Step 2 — Copy
  User->>InviteLinkActions: click "Copy link"
  InviteLinkActions->>InviteLinkActions: handleCopy()
  InviteLinkActions->>Clipboard: navigator.clipboard.writeText(revealedUrl)
  Clipboard-->>InviteLinkActions: success
  InviteLinkActions->>InviteLinkActions: setCopied(true); setTimeout(..., 2000)
```

### 4. Function call flow (all dependencies)

| Location | Function | Calls | Purpose |
|----------|----------|--------|---------|
| `lib/invite.ts` | (constant) | — | `INVITE_LINK_DISPLAY_PLACEHOLDER` = `"/accept-invite?..."` |
| `lib/api-client.ts` | `revealInviteLink(id)` | `getBaseUrl()`, `fetch()`, `parseApiPayload()` | POST to backend, returns `{ inviteUrl }` |
| `pending-invitations-table.tsx` | `InviteUrlCell` | `INVITE_LINK_DISPLAY_PLACEHOLDER`, `revealInviteLink`, `toast` | Table cell: Get link → Copy |
| `pending-invitations-table.tsx` | `handleGetLink` | `revealInviteLink(invitationId)`, `setRevealedUrl`, `toast.error` | Fetch URL, store in state |
| `pending-invitations-table.tsx` | `handleCopy` | `navigator.clipboard.writeText(revealedUrl)`, `toast.error` | Copy from state to clipboard |
| `invite-users-dialog.tsx` | `InviteLinkActions` | Same pattern as above | Modal: Get link → Copy link |
| `invite-users-dialog.tsx` | `handleGetLink` | `revealInviteLink(invitationId)`, `setRevealedUrl`, `toast.error` | Same as table |
| `invite-users-dialog.tsx` | `handleCopy` | `navigator.clipboard.writeText(revealedUrl)`, `toast.error` | Same as table |

**Data flow:**

- **Display:** Only `INVITE_LINK_DISPLAY_PLACEHOLDER` is passed to the DOM (in both the table and the modal). The real `inviteUrl` is never passed to any React node that renders text content.
- **Storage:** `inviteUrl` exists only in component state (`revealedUrl`) after a successful `revealInviteLink` call.
- **Copy:** `handleCopy` reads `revealedUrl` from closure and passes it to `navigator.clipboard.writeText`. No DOM, no input value, no aria-label contains the URL.

---

## Why This Approach Is Secure

1. **No URL in the DOM**  
   The real invite URL is never assigned to `innerText`, `value`, `placeholder`, `aria-label`, or any attribute. Only the literal constant `"/accept-invite?..."` is rendered. So:
   - DevTools "Inspect" won’t show the token.
   - Screen readers and automation only see the placeholder.
   - Screenshots/screen capture of the UI don’t expose the token.

2. **Clipboard only after user action**  
   `navigator.clipboard.writeText(revealedUrl)` runs synchronously inside the Copy button’s click handler, with no `await` before it. So the write happens in the same user activation and is allowed by the browser, and we don’t leak the URL to the clipboard until the user explicitly clicks Copy.

3. **Two-step flow**  
   The URL is first fetched (Get link) and stored in memory; Copy is a separate step. So:
   - No single click both fetches and copies (which previously caused the async-gap `NotAllowedError`).
   - The user intentionally gets the link and then copies it.

4. **Backend and auth unchanged**  
   `revealInviteLink` still uses the same auth (e.g. cookies/credentials) and the same backend route. We didn’t weaken server-side checks; we only changed when we call the API and when we write to the clipboard.

---

## Where Issues Might Appear

| Risk | Why it can still happen | Mitigation / note |
|------|-------------------------|-------------------|
| **URL in JavaScript memory** | After "Get link", the full URL lives in React state until the component unmounts or the user leaves. | Acceptable for in-session use. No way to show "Copy" without holding the URL in memory. |
| **URL in clipboard** | After "Copy", the full URL is in the clipboard and can be pasted elsewhere or read by other apps. | Normal for "copy link" flows. Rely on user and OS clipboard behavior. |
| **Backend / transport** | If the reveal-link endpoint or transport is weak, the URL can be intercepted or over-exposed. | Out of scope of this flow; ensure HTTPS and proper auth on `POST .../reveal-link`. |
| **Permissions** | If the user denies clipboard permission when Copy runs, `writeText` throws and we show `toast.error`. | Handled in code; no silent failure. |
| **Multiple tabs / state** | If the same invitation is opened in two tabs, each has its own state; no cross-tab sync. | Acceptable; each tab has its own Get link / Copy flow. |

---

## Summary

- **Secure for the intended design:** The real invite URL is never rendered in the DOM; it exists only in component state and (after Copy) in the clipboard, and clipboard write is done in the same user gesture as the Copy click.
- **Full flow:** User clicks Get link → `revealInviteLink` → backend returns URL → stored in `revealedUrl` → UI still shows `INVITE_LINK_DISPLAY_PLACEHOLDER` → User clicks Copy → `navigator.clipboard.writeText(revealedUrl)` in the same activation.
- **Remaining risks** are limited to normal "copy link" behavior (memory + clipboard) and to backend/transport security, which are unchanged by this implementation.
