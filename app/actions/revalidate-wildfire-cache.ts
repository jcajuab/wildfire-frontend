"use server";

import { revalidateTag } from "next/cache";

import type { ServerCacheTag } from "@/lib/server/api";

const PREFIX = "wildfire:";

/**
 * Invalidate Next.js Data Cache entries tagged for a Wildfire domain.
 * Call after mutations from client components (e.g. RTK `onQueryStarted`).
 *
 * Tag usage / mutation alignment (server `serverFetchJson` tags → bumps in API modules):
 * - **content-list** — content grid RSC (`content` list).
 * - **content-options** — `content/options` (playlist picker SSR); bumped with content mutations.
 * - **displays-bootstrap** — displays list/bootstrap RSC.
 * - **displays-options** — `displays/options` (logs filters); bumped with display mutations.
 * - **users-list** / **users-options** — users RSC vs `users/options` (logs); RBAC user mutations bump both.
 * - **roles-list** / **roles-options** — roles RSC vs role dropdown on users page.
 * - **role-edit-bootstrap** — role edit RSC; role rename/permissions updates.
 * - **permissions-options** — permissions catalog for role create (coarse bumps rarely needed).
 * - **schedules-bootstrap** — schedules RSC.
 * - **playlists** — playlist list + detail RSC.
 * - **audit** — audit log RSC (not invalidated by display/user bumps after tag split).
 * - **ai** — settings credentials RSC.
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
