import { api } from "@/lib/api/api";
import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import type { ServerCacheTag } from "@/lib/server/api";

type WildfireTag = Parameters<typeof api.util.invalidateTags>[0][number];
type InvalidateTagsAction = ReturnType<typeof api.util.invalidateTags>;
type CacheDispatch = (action: InvalidateTagsAction) => unknown;

export interface MutationCacheEffect {
  readonly invalidate?: readonly WildfireTag[];
  readonly revalidate?: readonly ServerCacheTag[];
}

export async function applyMutationCacheEffects(
  dispatch: CacheDispatch,
  effect: MutationCacheEffect,
): Promise<void> {
  if (effect.invalidate && effect.invalidate.length > 0) {
    dispatch(api.util.invalidateTags([...effect.invalidate]));
  }

  if (effect.revalidate && effect.revalidate.length > 0) {
    await revalidateWildfireTagsViaRoute(effect.revalidate);
  }
}

export async function markTouchedAuditCache(
  dispatch: CacheDispatch,
): Promise<void> {
  await applyMutationCacheEffects(dispatch, {
    invalidate: [{ type: "AuditEvent", id: "LIST" }],
    revalidate: ["audit"],
  });
}
