import type { ServerCacheTag } from "@/lib/server/api";

/**
 * Invalidate Next.js Data Cache entries by calling the `/api/revalidate` Route
 * Handler via `fetch()`. Unlike the Server Action (`revalidateWildfireTags`),
 * this does NOT purge the client-side Router Cache, so unrelated pages keep
 * their cached RSC payloads.
 *
 * Use this from RTK Query `onQueryStarted` callbacks instead of the Server
 * Action to avoid global Router Cache invalidation.
 */
export async function revalidateWildfireTagsViaRoute(
  tags: readonly ServerCacheTag[],
): Promise<void> {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // best-effort — cache will expire naturally via TTL
  }
}

export async function revalidateWildfireTagViaRoute(
  tag: ServerCacheTag,
): Promise<void> {
  return revalidateWildfireTagsViaRoute([tag]);
}
