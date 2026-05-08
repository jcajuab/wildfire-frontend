import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendPlaylistSummary } from "@/lib/api/playlists-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  PLAYLISTS_PAGE_SIZE,
  playlistsListQueryFromSearchParams,
} from "@/lib/playlists-search-params";
import { cacheLife, cacheTag } from "next/cache";

import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { PlaylistsPageView } from "./playlists-page-client";

interface PlaylistsPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

async function getCachedPlaylistsList(params: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  status?: string;
  ownerId?: string;
  search?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:playlists");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "playlists",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  return transformPaginatedListResponse<BackendPlaylistSummary>(
    res.data,
    "listPlaylists",
  );
}

export default async function PlaylistsPage({
  searchParams,
}: PlaylistsPageProps): Promise<ReactElement> {
  const sp = (await searchParams) ?? {};
  const queryArgs = playlistsListQueryFromSearchParams(sp);

  const [sessionResult, listData] = await Promise.all([
    getCachedServerSession(),
    getCachedPlaylistsList({
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? PLAYLISTS_PAGE_SIZE,
      sortBy: queryArgs.sortBy ?? "createdAt",
      sortDirection: queryArgs.sortDirection ?? "desc",
      status: queryArgs.status,
      ownerId: queryArgs.ownerId,
      search: queryArgs.search,
    }),
  ]);

  const session = resolveSession(sessionResult, "/admin/playlists");
  if (!session) {
    return (
      <PlaylistsPageView initialQueryArgs={queryArgs} initialData={undefined} />
    );
  }
  if (!sessionHasPermission(session, "playlists:read")) {
    redirect("/unauthorized");
  }

  return (
    <PlaylistsPageView
      initialQueryArgs={queryArgs}
      initialData={listData ?? undefined}
    />
  );
}
