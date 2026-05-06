import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendPlaylistSummary } from "@/lib/api/playlists-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  PLAYLISTS_PAGE_SIZE,
  playlistsListQueryFromSearchParams,
} from "@/lib/playlists-search-params";
import { getServerSession, resolveSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { PlaylistsPageView } from "./playlists-page-client";

interface PlaylistsPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function PlaylistsPage({
  searchParams,
}: PlaylistsPageProps): Promise<ReactElement> {
  const sp = (await searchParams) ?? {};
  const queryArgs = playlistsListQueryFromSearchParams(sp);

  const session = resolveSession(await getServerSession(), "/admin/playlists");
  if (!session) {
    return <PlaylistsPageView initialQueryArgs={queryArgs} initialData={undefined} />;
  }
  if (!sessionHasPermission(session, "playlists:read")) {
    redirect("/unauthorized");
  }

  const listRes = await serverFetchJson<unknown>({
    session,
    path: "playlists",
    searchParams: {
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? PLAYLISTS_PAGE_SIZE,
      status: queryArgs.status,
      search: queryArgs.search,
      sortBy: queryArgs.sortBy ?? "createdAt",
      sortDirection: queryArgs.sortDirection ?? "desc",
    },
    tags: ["playlists"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(listRes, "/admin/playlists");

  const listData = transformPaginatedListResponse<BackendPlaylistSummary>(
    listRes.data,
    "listPlaylists",
  );

  return (
    <PlaylistsPageView initialQueryArgs={queryArgs} initialData={listData} />
  );
}
