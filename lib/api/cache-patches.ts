/**
 * Helpers for patching paginated RTK Query caches (Immer drafts) without broad LIST invalidation.
 */

export type ListPatchPosition = "start" | "end";

/**
 * Mutate a paginated list draft in place: add, replace by id, or remove by id.
 */
export function patchPaginatedListById<T extends { id: string }>(
  draft: { items: readonly T[] | T[]; total: number },
  action: "add" | "update" | "remove",
  item: T,
  options?: { position?: ListPatchPosition },
): void {
  const mutableDraft = draft as { items: T[]; total: number };
  const items = mutableDraft.items;
  if (action === "remove") {
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      items.splice(idx, 1);
      mutableDraft.total = Math.max(0, mutableDraft.total - 1);
    }
    return;
  }

  if (action === "update") {
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      items[idx] = item;
    }
    return;
  }

  const idx = items.findIndex((x) => x.id === item.id);
  if (idx !== -1) {
    items[idx] = item;
    return;
  }

  if (options?.position === "start") {
    items.unshift(item);
  } else {
    items.push(item);
  }
  mutableDraft.total += 1;
}

export function removeFromPaginatedListById<T extends { id: string }>(
  draft: { items: readonly T[] | T[]; total: number },
  id: string,
): void {
  const stub = { id } as T;
  patchPaginatedListById(draft, "remove", stub);
}
