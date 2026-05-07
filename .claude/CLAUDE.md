# Rules for `useEffect` and alternatives

Strict guardrails for AI and human contributors. Before adding a `useEffect`, check the table at the bottom of this file. These rules are derived from React's [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) and team conventions.

---

## 1. Derive state in render; do not "sync" it with an effect

**Rule:** If a value can be computed from props, state, or context alone, compute it during render. Do not store it in separate state and update it in `useEffect`.

**Smell:**

- `useEffect(() => setFiltered(items.filter(...)), [items])`
- State that only mirrors other state or props

**Bad:**

```tsx
useEffect(() => {
  setFilteredProducts(products.filter((p) => p.inStock));
}, [products]);
```

**Good:**

```tsx
const filteredProducts = products.filter((p) => p.inStock);
```

---

## 2. Use a data-fetching library instead of `useEffect` + `fetch`

**Rule:** Prefer RTK Query, TanStack Query, SWR, or similar for server state.

**Smell:**

- Effect body does `fetch(...).then(setData)`
- You are re-implementing loading/error/refetch semantics

---

## 3. Prefer event handlers for user-driven work

**Rule:** When the user clicks, submits, or refreshes, perform the work in that handler. Avoid "set a flag → effect observes flag → does the real work."

**Smell:**

- State exists only so an effect can react to it
- "Relay" pattern: `setLiked(true)` then effect posts to API

**Bad:**

```tsx
useEffect(() => {
  if (liked) {
    postLike();
    setLiked(false);
  }
}, [liked]);
```

**Good:**

```tsx
<button onClick={() => postLike()}>Like</button>
```

---

## 4. One-time external sync: mount-only effects

**Rule:** For true external systems (DOM focus, third-party widgets, `window` subscriptions), use an effect with empty deps (or a `useMountEffect` wrapper).

**Good uses:** focus management, non-React widgets (maps, video players), subscribing to `window` / `matchMedia`.

---

## 5. Reset behavior with `key`, not effect dependency choreography

**Rule:** When a subtree should fully reset when an identifier changes, prefer `key={id}` on the component so React remounts a clean instance.

**Bad:**

```tsx
useEffect(() => {
  loadVideo(videoId);
}, [videoId]);
```

**Good:**

```tsx
<VideoPlayer key={videoId} videoId={videoId} />
```

**Corollary — "adjust state during render" pattern:** When you need to re-initialize local state from a prop change without remounting (e.g., a resource loads async), use the React-approved render-time setState pattern instead of an effect:

```tsx
if (playlist.id !== loadedId) {
  setLoadedId(playlist.id);
  setName(playlist.name);
  // React immediately re-renders with these values; no effect needed
}
```

---

## 6. `useLayoutEffect` vs `useEffect`

**Rule:** Default to `useEffect`. Use `useLayoutEffect` only when you must read from the DOM or apply DOM updates **before the browser paints** (avoid flicker, incorrect measurements).

---

## 7. Do not sync state upward via `useEffect`

**Rule:** Do not use `useEffect` to call a parent callback (e.g. `onStateChange`) whenever child state changes. This causes extra renders after paint and creates stale-closure risks.

**Bad:**

```tsx
// child
useEffect(() => {
  onStateChange({ canSave, handleSave })
}, [canSave, handleSave, onStateChange])

// parent
const [formState, setFormState] = useState(null)
<Form onStateChange={setFormState} />
<Button disabled={!formState?.canSave} />
```

**Good — lift state into the parent:**

```tsx
// parent owns the state and computes canSave during render
const canSave = !isSaving && !isOverDurationLimit
<Form name={name} onNameChange={setName} ... />
<Button disabled={!canSave} />
```

---

## 8. Do not write to external stores during render

**Rule:** Updating Zustand/Redux, sending analytics, or mutating module-level singletons during render is unsafe. Render must stay pure and repeatable.

---

## Quick checklist before adding `useEffect`

| Question                                                  | If yes                                       |
| --------------------------------------------------------- | -------------------------------------------- |
| Can this be a variable derived from existing state/props? | Derive in render (§1).                       |
| Is this server data?                                      | Use RTK Query / SWR (§2).                    |
| Did the user just do something?                           | Use an event handler (§3).                   |
| Is this DOM / third-party mount integration?              | Mount-only effect (§4).                      |
| Should the whole subtree reset when `id` changes?         | Use `key` (§5).                              |
| Am I notifying a parent about child state changes?        | Lift state up instead (§7).                  |
| Am I syncing two stores / networks?                       | Avoid render; use explicit async paths (§8). |
