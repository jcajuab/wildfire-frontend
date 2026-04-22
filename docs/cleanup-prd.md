# Wildfire Frontend Cleanup PRD

Source of truth: the 27 findings from the frontend cleanup audit (C1–C5, M1–M9, m1–m13). This PRD pins every finding to a phase with acceptance checks and rollback. No scope expansion, no new findings.

- Repo: `/home/jcajuab/Codebase/wildfire`
- Frontend: `./frontend` (Next.js 16, React 19, Tailwind v4, shadcn radix-mira, ai-elements v2, RTK Query, pnpm)
- Finding tally: 5 critical + 9 major + 13 minor = 27 ✓

## 1. Summary

The user-authored layer on top of shadcn + ai-elements has accumulated classic AI slop: three hand-rolled multi-select comboboxes solving the same problem, ~250 LoC of dead ai-elements exports, a near-duplicate 1000 LoC of add/edit-display dialogs, user-menu/logout logic copied three times, and smaller-grained noise (duplicate type branches, redundant tooltip providers, over-engineered group-overflow measuring). This PRD removes it in four phase-gated passes — deletes first, primitive resets next, feature-layer dedup third, polish last — each landing on green CI before the next begins. Behavior and visual parity are non-negotiable.

## 2. Inventory

| id  | severity | file(s)                                                                 | category              | target state            | est. LoC delta |
| --- | -------- | ----------------------------------------------------------------------- | --------------------- | ----------------------- | -------------- |
| C1  | critical | `components/ai-elements/confirmation.tsx:11-37`                         | ai slop / docs mismatch | inline (use `ToolUIPart["approval"]`) | −25            |
| C2  | critical | `components/ai/ai-chat.tsx:314-425`                                     | primitive drift / ai-elements overlap | reset to primitive (`PromptInputTextarea`) | −80            |
| C3  | critical | `components/displays/display-groups-combobox.tsx`, `display-groups-tags-input.tsx`, `components/schedules/schedule-form.tsx:30-150` | primitive drift / shadcn overlap | reset to `@/components/ui/combobox` | −350           |
| C4  | critical | `components/ai-elements/prompt-input.tsx` (1344 LoC)                    | dead code / ai slop   | simplify (delete provider pathway + unused exports) | −500 total (split: −250 Phase 1 dead exports, −250 Phase 2 provider pathway) |
| C5  | critical | `components/displays/add-display-dialog.tsx`, `edit-display-dialog.tsx` | ai slop / convention drift | split (extract `DisplayFormBody`) | −250 (net, new helper + shrunk dialogs) |
| M1  | major    | `components/ai-elements/message.tsx`, `conversation.tsx`                | dead code / ai slop   | delete unused exports | −220           |
| M2  | major    | `components/ai-elements/message.tsx:98-108`                             | primitive drift / ai slop | delete (tied to M1) | −11            |
| M3  | major    | `components/layout/app-sidebar.tsx`, `mobile-header.tsx`, `app/admin/(dashboard)/settings/page.tsx` | ai slop / convention drift | extract `UserMenu` + `useLogout` | −120 (net)     |
| M4  | major    | `components/displays/display-card.tsx:31-199, 348-375`                  | ai slop               | simplify (CSS or constant-cap) | −90            |
| M5  | major    | `components/dev-accessibility-checker.tsx`                              | ai slop / outdated code | simplify (single effect) | −8             |
| M6  | major    | `components/common/pagination-footer.tsx`                               | shadcn overlap / convention drift | replace with shadcn `pagination` | −60 (net)      |
| M7  | major    | `components/layout/dashboard-page.tsx`                                  | ai slop / primitive drift | inline (delete compound) | −149           |
| M8  | major    | `components/displays/step-indicator.tsx:27-35`                          | ai slop               | keep + collapse duplicate branch | 0 to −5        |
| M9  | major    | `components/displays/display-groups-combobox.tsx`                       | primitive drift / shadcn overlap | delete (covered by C3) | (counted in C3) |
| m1  | minor    | `components/displays/group-badge.tsx`                                   | ai slop / dead code   | inline or consolidate | −15            |
| m2  | minor    | `components/layout/dashboard-page.tsx:31-36`                            | ai slop               | inline (covered by M7) | (counted in M7) |
| m3  | minor    | `components/ai/ai-chat.tsx:171-175`                                     | convention drift      | simplify (use children) | −5             |
| m4  | minor    | `components/ai/ai-chat-bubble.tsx`                                      | import bloat / ai slop | evaluate replacement of `framer-motion` | −60 if replaced, 0 if kept |
| m5  | minor    | sidebar/settings label drift                                            | style churn           | merge via `useLogout` (covered by M3) | (counted in M3) |
| m6  | minor    | `next.config.ts:30`                                                     | outdated code         | keep (evaluate `transpilePackages` removal) | −1 if removed  |
| m7  | minor    | `components/layout/app-sidebar.tsx:176, 211`                            | ai slop (speculative) | simplify (drop `mounted` gate) | −4             |
| m8  | minor    | `components/ai/ai-chat-bubble.tsx:171-187`                              | convention drift      | simplify (single credential subscription) | −10            |
| m9  | minor    | `components/ai-elements/tool.tsx:152`                                   | ai slop               | simplify (language `"text"`) | −1             |
| m10 | minor    | `components/ai-elements/confirmation.tsx:108-147`                       | ai slop               | simplify (factor resolved flag) | −20            |
| m11 | minor    | `components/ai-elements/message.tsx:324-336`                            | pointless memoization / docs mismatch | simplify (drop custom equality) | −3             |
| m12 | minor    | `components/ai-elements/prompt-input.tsx`                               | ai slop               | simplify (strip banner comments and narrative) | −40            |
| m13 | minor    | `components/ai/ai-chat.tsx:115, 371-394`                                | ai slop               | simplify (drop local `isComposing`) | −4             |

**Estimated total net delta:** approximately −2050 LoC removed, +80 LoC added (new `DisplayFormBody`, `UserMenu`, `useLogout`) → **~−1970 LoC net**.

## 3. Phases

Phase N is blocked on Phase N−1 being **merged to the working branch and green on CI** (lint + test + build). Each phase lands as an atomic commit or a reviewable PR; no phase may straddle a merge.

### Phase 1 — Safe deletes & mechanical cleanup

**Scope:** C1, C4 (dead-exports half only), M1, M2, M5, m10, m11, m12, m13, plus any `knip`-confirmed dead exports.

**Hard rule:** pure deletes / in-place simplifications. No call-site migrations. No primitive swaps. No UX changes. No signature changes on components used elsewhere. If a change has a consumer outside the target file, it belongs to Phase 2 or Phase 3, not here.

**Prerequisite (one-time, same phase):** neither `knip` nor `ts-prune` is currently installed. Use `pnpm dlx knip@latest` (or install as `devDependency` inside this phase's commit — no runtime impact) so the acceptance floor is enforceable. Commit message: `chore(frontend): add knip dev dep for dead-export gating`.

**File manifest (touch list):**
- `frontend/components/ai-elements/confirmation.tsx` — C1 (replace `ToolUIPartApproval` with `ToolUIPart["approval"]`), m10 (factor resolved flag in `ConfirmationAccepted`/`ConfirmationRejected`).
- `frontend/components/ai-elements/message.tsx` — M1 (delete `MessageActions`, `MessageAction`, `MessageBranch*` block, `MessageToolbar`, `MessageBranchContext`, `useMessageBranch`), M2 (removed with `MessageAction`), m11 (drop custom memo equality on `MessageResponse`).
- `frontend/components/ai-elements/conversation.tsx` — M1 (delete `ConversationDownload`, `messagesToMarkdown`, `defaultFormatMessage`, `ConversationMessage` type).
- `frontend/components/ai-elements/prompt-input.tsx` — C4 part 1: delete exports with **zero external consumers**: `PromptInputTab*` (5 symbols), `PromptInputCommand*` (6 symbols), `PromptInputHoverCard*` (3 symbols), `PromptInputActionMenu*` (3 symbols), `PromptInputActionAddAttachments`. Also m12 (strip `// ===` section banners and behavioral narrative comments). The **provider pathway** (`PromptInputProvider`, `usePromptInputController`, `useProviderAttachments`, `useOptional*`, `LocalReferencedSourcesContext`, `usePromptInputReferencedSources`, `__registerFileInput`, `addWithProviderValidation`) stays for Phase 2; removing it touches the component signature consumed by `ai-chat.tsx`.
- `frontend/components/dev-accessibility-checker.tsx` — M5 (flatten to static imports of React/ReactDOM + single dynamic import of `@axe-core/react`).
- `frontend/components/ai/ai-chat.tsx` — m13 (delete local `isComposing` state, use `e.nativeEvent.isComposing` only). m3 (`ConversationEmptyState` with `title=""`) stays for Phase 3 because it changes call shape.
- `frontend/components/ai-elements/tool.tsx` — m9 (change `language="json"` to `"text"` for string output path).
- **Knip sweep:** delete any additional unused exports flagged by `pnpm dlx knip --production=false`, only if removing them is pure deletion with no call-site touch. Anything requiring consumer edits is deferred to the matching feature phase.

**Dependencies:** none (this is the first phase).

**Acceptance checks (floor, all must pass with fresh evidence):**
- `cd frontend && pnpm run lint` exits 0.
- `cd frontend && pnpm run test` exits 0, with:
  - Test count ≥ pre-phase count (no deletions).
  - Zero `.skip` / `.only` / `xit` / `xdescribe` added in the diff.
- `cd frontend && pnpm run build` exits 0.
- `cd frontend && pnpm dlx knip --production=false --reporter compact` shows **no new** unused exports versus the pre-phase baseline. (Baseline captured on the first run of the phase, checked into `docs/cleanup-baselines/knip-phase1.txt` as the comparison artifact.)
- `git grep -nE "MessageActions|MessageAction\b|MessageBranch|MessageToolbar|ConversationDownload|messagesToMarkdown|PromptInputTab|PromptInputCommand|PromptInputHoverCard|PromptInputActionMenu|PromptInputActionAddAttachments|ToolUIPartApproval" frontend/` returns no matches except in deletion-marked files or this PRD.
- Visual parity: `ai-chat` bubble renders; `Tool` output with a string renders unhighlighted; `Confirmation` accept/reject states render. Manual spot-check via `pnpm run dev` on `/admin` and trigger an AI chat with a string-returning tool call.

**Rollback plan:** `git revert <phase-1-merge-commit>` (single squash-merge commit per phase keeps revert trivial).

---

### Phase 2 — Primitive replacements

**Scope:** C2, C3, C4 (provider pathway removal), M6, M9.

**Hard rule:** every swap must preserve the current visual treatment (per project rule: "Rebuild custom components to match old frontend visually; logic changes, UI stays the same"). Keyboard semantics must match or improve. No new a11y regressions.

**File manifest:**
- `frontend/components/ui/combobox.tsx` — no edits; this is the target primitive.
- `frontend/components/displays/display-groups-combobox.tsx` — **delete** after migrating callers (M9, part of C3).
- `frontend/components/displays/display-groups-tags-input.tsx` — keep (it already composes `ui/combobox`); becomes the canonical groups selector.
- `frontend/app/admin/displays/register/page.tsx` — migrate from `DisplayGroupsCombobox` to `DisplayGroupsTagsInput` (C3).
- `frontend/components/displays/add-display-dialog.tsx` — migrate (C3).
- `frontend/components/displays/edit-display-dialog.tsx` — migrate (C3).
- `frontend/components/schedules/schedule-form.tsx` — delete local `DisplayMultiSelect` (lines 30–150) and replace its single call site (~line 458) with `ui/combobox` composition (C3).
- `frontend/components/ai/ai-chat.tsx` — replace the raw `<textarea>` + mirror-div block (C2) with `PromptInputTextarea`; slash-command highlight moves into the menu itself, not overlaid on the textarea.
- `frontend/components/ai-elements/prompt-input.tsx` — delete the provider pathway (C4 part 2): `PromptInputProvider`, `PromptInputController`, `ProviderAttachmentsContext`, `usePromptInputController`, `useProviderAttachments`, `useOptional*`, `LocalReferencedSourcesContext`, `usePromptInputReferencedSources`, `__registerFileInput`, the dual `addLocal` / `addWithProviderValidation` branches — consolidated to a single `add` path. File drops to ~800 LoC.
- `frontend/components/common/pagination-footer.tsx` — **replace** with shadcn `pagination` primitive (M6). Add via `pnpm dlx shadcn@latest add pagination`. Keep `getNumberedPageTokens` as a local helper (it's correct). Maintain the "Showing X to Y of Z" label.

**Dependencies:** Phase 1 merged and green.

**Acceptance checks (floor + phase-specific):**
- All Phase 1 floor checks pass (`lint`, `test`, `build`, `knip`).
- Visual parity regression smoke (manual): register-display wizard, add-display dialog, edit-display dialog, schedule-form with target displays, AI chat send, each of the 6 pages using `PaginationFooter` (`content`, `displays`, `logs`, `playlists`, `roles`, `users`) — all look identical to the pre-phase screenshot reference (captured in `docs/cleanup-baselines/screenshots/phase2/`).
- Accessibility check: `pnpm run test` includes any existing a11y tests; manual `axe` pass via the in-app `DevAccessibilityChecker` shows zero regressions on the five touched surfaces.
- `git grep -nE "DisplayGroupsCombobox|DisplayMultiSelect|PromptInputProvider|usePromptInputController" frontend/` returns no matches.
- Line count: `frontend/components/ai-elements/prompt-input.tsx` drops to ≤900 LoC.

**Rollback plan:** `git revert <phase-2-merge-commit>`.

---

### Phase 3 — Feature-layer deduplication

**Scope:** C5, M3, M4, M7, M8, m1, m2, m3, m7, m8.

**File manifest:**
- `frontend/components/displays/display-form-body.tsx` — **new** (≤200 LoC). Extract the shared field layout used by add- and edit-display (C5).
- `frontend/components/displays/add-display-dialog.tsx` — thin to wizard + submit only; compose `DisplayFormBody` (C5).
- `frontend/components/displays/edit-display-dialog.tsx` — thin to submit only; compose `DisplayFormBody` (C5).
- `frontend/components/layout/user-menu.tsx` — **new**. Avatar + dropdown (Settings + Log Out) (M3).
- `frontend/hooks/use-logout.ts` — **new**. Encapsulates `isLoggingOut` + logout call (M3, m5).
- `frontend/components/layout/app-sidebar.tsx` — use `UserMenu` + `useLogout`; drop local state and duplicated avatar code; drop `mounted ? item.title : undefined` tooltip gating (m7).
- `frontend/components/layout/mobile-header.tsx` — use `UserMenu` + `useLogout`.
- `frontend/app/admin/(dashboard)/settings/page.tsx` — use `useLogout` for the page-level logout CTA; do not render `UserMenu` (it belongs to chrome).
- `frontend/components/displays/display-card.tsx` — delete `getVisibleGroupCount`, `groupMeasureRef`, `groupOverflowContainerRef`, `visibleGroupCount` state, ResizeObserver, and hidden measure DOM; replace with a fixed `MAX_VISIBLE_GROUPS` constant + `flex` wrap-clip + `+N` chip (M4).
- `frontend/components/displays/group-badge.tsx` — decide inline vs consolidate (m1). Default: keep `GroupBadge` and use it in `display-card.tsx` too, replacing the three inline `<Badge className="...blue-600 text-white">` repetitions.
- `frontend/components/layout/dashboard-page.tsx` — **delete** (M7, m2). All 12 callers migrate to plain `<section>`/`<div>` + existing `PageHeader`.
- `frontend/app/admin/(dashboard)/**/page.tsx` (12 files) — remove `DashboardPage.*` usages.
- `frontend/components/displays/step-indicator.tsx` — collapse the duplicate `isCompleted ? ... : isCurrent ? ...` ternary to a single condition; keep the existing visual (M8). If current and completed must differ visually, add a subtle ring to current — decision deferred to the executor unless product input is needed.
- `frontend/components/ai/ai-chat.tsx` — swap `ConversationEmptyState title=""` for a `children` prop render (m3).
- `frontend/components/ai/ai-chat-bubble.tsx` — unify credential gating with `ai-chat` so credentials fetch once per mount (m8).

**Dependencies:** Phase 2 merged and green. `DisplayFormBody` depends on Phase 2 because both dialogs already use the new combobox primitive.

**Acceptance checks (floor + phase-specific):**
- All floor checks pass.
- Visual parity: display-card group-overflow under every `display.groups.length` in the fixtures looks identical (manual + screenshot diff in `docs/cleanup-baselines/screenshots/phase3/display-card/`).
- `git grep -nE "DashboardPage\." frontend/` returns no matches.
- `git grep -nE "isLoggingOut|setIsLoggingOut" frontend/` matches only inside `frontend/hooks/use-logout.ts`.
- `add-display-dialog.tsx` and `edit-display-dialog.tsx` each drop below 250 LoC.
- AI chat empty state renders with the Wildfire logo unchanged.
- Existing tests `display-card.test.tsx`, `add-display-dialog.test.tsx`, `edit-display-dialog.test.tsx` continue to pass without modification (or are amended only to reflect intentional refactor seams, never to weaken assertions).

**Rollback plan:** `git revert <phase-3-merge-commit>`. `DisplayFormBody` extraction is the highest-risk item — if revert is needed, the single commit restores the dialogs.

---

### Phase 4 — Polish / bundle

**Scope:** m4, m6, m9 (already shipped in Phase 1 via language change, retained here for residue check), and any residue from earlier phases.

**File manifest:**
- `frontend/components/ai/ai-chat-bubble.tsx` — **evaluate** replacing `framer-motion` open/close animation with `tw-animate-css` (already a dep) + CSS transforms (m4). Drag-to-reposition gesture: if product-required, swap to `@dnd-kit` (already a dep); if not, drop. Decision captured inline; this phase does not introduce new deps.
- `frontend/next.config.ts` — remove `@base-ui/react` from `transpilePackages` if the pinned `^1.3.0` ships proper ESM (m6). Verify by building twice: with and without the entry. Revert the edit if the no-entry build fails.
- `frontend/package.json` — if `framer-motion` is fully removed in m4, drop the dep.
- Residue sweep across `frontend/components/**` for any leftover dead imports, unused `"use client"` on server-safe files, or comment noise missed in m12.

**Dependencies:** Phase 3 merged and green.

**Acceptance checks (floor + phase-specific):**
- All floor checks pass.
- If `framer-motion` removed: `git grep -n "framer-motion" frontend/` returns no matches; bundle analysis (`pnpm run analyze`) shows `ai-chat-bubble` chunk shrunk.
- If `@base-ui/react` `transpilePackages` entry removed: `pnpm run build` completes with identical output hash compared to pre-change (combobox renders).
- No regression on animation behavior of `AIChatBubble` (manual).
- Final `knip` run is clean versus the Phase 1 baseline.

**Rollback plan:** `git revert <phase-4-merge-commit>`. Each sub-decision (framer-motion drop, transpilePackages drop) lands as its own commit inside the phase so one can be reverted independently if needed.

## 4. Risk register

| id  | risk                                                                                   | likelihood | impact | mitigation |
| --- | -------------------------------------------------------------------------------------- | ---------- | ------ | ---------- |
| C1  | `ToolUIPart["approval"]` shape differs from the hand-written union and narrows differently | low        | med    | type-check all call sites in `ai-chat.tsx` before merge; Phase 1 build must stay clean. |
| C2  | Slash-command highlight moves from textarea overlay to menu; power users notice missing in-textarea highlighting | low        | med    | keep the menu's matched token list as the highlight surface; collect feedback before Phase 3. |
| C3  | Three call-site migrations change ARIA wiring (base-ui vs hand-rolled).                | med        | med    | capture keyboard + screen-reader smoke per call site; `axe` via `DevAccessibilityChecker` must show zero new issues. |
| C4 (provider pathway) | Removing the provider pathway closes a public API surface (none consumed today). | low        | low    | none external consumers — deletion is safe. Document removal in the phase PR description. |
| C5  | Extracting `DisplayFormBody` risks drifting defaults between add and edit modes.        | med        | med    | keep a single `mode: "add" | "edit"` prop; existing `*.test.tsx` must pass unchanged. |
| M3  | Shared `UserMenu` masks a subtle difference between sidebar and mobile header layouts. | med        | low    | take screenshots pre/post for both widths; parity before merge. |
| M4  | Capping `MAX_VISIBLE_GROUPS` by constant regresses in ultra-wide layouts where more fit. | med        | low    | choose constant based on median `display.groups.length` across fixtures; document in the component. |
| M6  | shadcn `pagination` primitive has different default styling; visual drift. | low        | med    | override classes to match current spacing/typography; screenshot diff gate. |
| M7  | Inlining `DashboardPage.*` touches 12 files; risk of inconsistency. | med        | low    | one commit per compound replacement; verify each page renders identically. |
| m4  | Dropping `framer-motion` changes bubble animation feel. | low        | low    | only drop if replacement CSS transform is subjectively equal; revert commit if not. |
| m6  | Removing `transpilePackages` entry could break the build on certain deployment targets. | low        | high   | build twice (with and without) before merging; revert if either fails. |

Non-behavior-altering findings (C4 dead exports, M1, M2, M5, M8, m1, m2, m3, m7, m8, m9, m10, m11, m12, m13) carry low risk — excluded from this register.

## 5. Non-goals

Explicitly out of scope for this cleanup:
- New features or product behavior changes.
- RTK Query refactors (`lib/api/*`, `lib/mappers/*`, `StoreProvider`, store shape).
- `components/content/pdf-crop-editor.tsx` rewrite or any PDF pipeline work.
- Content tiptap editor redesign (`components/content/tiptap-*.tsx`).
- Backend (`backend/`) changes of any kind.
- Test framework migration; test harness changes other than amendments required by refactors.
- Adding new dependencies beyond `knip` (Phase 1) and shadcn `pagination` (Phase 2); `framer-motion` removal is a net negative.
- Any finding not in the 27-item source of truth; net-new issues go to a separate follow-up PRD, not here.

## 6. Phase 1 scope block (verbatim)

```
Phase 1 — Safe deletes & mechanical cleanup

Scope (finding IDs): C1, C4 (dead-exports half only), M1, M2, M5, m10, m11, m12, m13,
                     plus knip-confirmed dead exports.

Hard rule: pure deletes / in-place simplifications only.
           No call-site migrations. No primitive swaps. No UX changes.
           No signature changes on components used elsewhere.

Prerequisite commit: add `knip` as a frontend devDependency (or pin pnpm dlx usage),
                     capture baseline to docs/cleanup-baselines/knip-phase1.txt.

File manifest:
  - frontend/components/ai-elements/confirmation.tsx   (C1, m10)
  - frontend/components/ai-elements/message.tsx        (M1, M2, m11)
  - frontend/components/ai-elements/conversation.tsx   (M1)
  - frontend/components/ai-elements/prompt-input.tsx   (C4 dead exports, m12)
  - frontend/components/ai-elements/tool.tsx           (m9)
  - frontend/components/dev-accessibility-checker.tsx  (M5)
  - frontend/components/ai/ai-chat.tsx                 (m13 only — m3 and C2 deferred)
  - Any additional knip-confirmed dead exports with zero external consumers.

Explicitly deferred (Phase 2+):
  - C2 (ai-chat textarea reset to primitive)
  - C3 (three combobox consolidation) and M9
  - C4 provider pathway
  - m3 (ConversationEmptyState children)
  - M6 (pagination primitive swap)
  - C5, M3, M4, M7, M8, m1, m2, m7, m8, m4, m6 — all later phases.

Acceptance checks (all must pass with fresh evidence):
  - cd frontend && pnpm run lint           → exit 0
  - cd frontend && pnpm run test           → exit 0, test count ≥ baseline, no new .skip/.only
  - cd frontend && pnpm run build          → exit 0
  - cd frontend && pnpm dlx knip --production=false --reporter compact
                                           → no new unused exports vs
                                             docs/cleanup-baselines/knip-phase1.txt
  - git grep -nE "MessageActions|MessageAction\b|MessageBranch|MessageToolbar|
                  ConversationDownload|messagesToMarkdown|PromptInputTab|
                  PromptInputCommand|PromptInputHoverCard|PromptInputActionMenu|
                  PromptInputActionAddAttachments|ToolUIPartApproval" frontend/
                                           → no matches (outside this PRD)
  - Visual parity smoke: AI chat bubble, Tool output with string, Confirmation states — unchanged.

Dependencies: none (first phase).

Rollback plan: `git revert <phase-1-merge-commit>` — phase lands as a single squash-merge commit.

Exit gate: do NOT start Phase 2. Print: "Phase 1 complete. Waiting on merge + green CI before Phase 2."
```
