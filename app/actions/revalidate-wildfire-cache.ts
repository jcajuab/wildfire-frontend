"use server";

import { revalidateTag } from "next/cache";

import type { ServerCacheTag } from "@/lib/server/api";

const PREFIX = "wildfire:";

/**
 * Invalidate Next.js Data Cache entries tagged for a Wildfire domain.
 * Call after mutations from client components (e.g. RTK `onQueryStarted`).
 */
/** Next.js 16+ requires an explicit cache profile for tag invalidation. */
const REVALIDATE_PROFILE = "default" as const;

export async function revalidateWildfireTag(
  tag: ServerCacheTag,
): Promise<void> {
  revalidateTag(`${PREFIX}${tag}`, REVALIDATE_PROFILE);
}

export async function revalidateWildfireTags(
  tags: readonly ServerCacheTag[],
): Promise<void> {
  for (const tag of tags) {
    revalidateTag(`${PREFIX}${tag}`, REVALIDATE_PROFILE);
  }
}
