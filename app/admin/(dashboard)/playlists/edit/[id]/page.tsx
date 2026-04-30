import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendContent } from "@/lib/api/content-api";
import type { BackendPlaylistWithItems } from "@/lib/api/playlists-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { PLAYLIST_CONTENT_PICKER_LIST_QUERY } from "@/lib/content-search-params";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { ContentListCacheSeeder } from "../../../content/content-page-client";
import {
  EditPlaylistPageView,
  PlaylistDetailCacheSeeder,
} from "./edit-playlist-page-client";

interface EditPlaylistPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function EditPlaylistPage({
  params,
}: EditPlaylistPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  const { id: playlistId } = await params;

  const redirectTo = encodeURIComponent(getPlaylistEditPath(playlistId));

  if (!session) {
    redirect(`/login?redirectTo=${redirectTo}`);
  }
  if (!sessionHasPermission(session, "playlists:update")) {
    redirect("/unauthorized");
  }

  const playlistRes = await serverFetchJson<unknown>({
    session,
    path: `playlists/${encodeURIComponent(playlistId)}`,
    tags: ["playlists"],
    revalidate: 30,
  });

  if (!playlistRes.ok) {
    redirect(`/login?redirectTo=${redirectTo}`);
  }

  const playlistData = parseApiResponseDataSafe<BackendPlaylistWithItems>(
    playlistRes.data,
    "getPlaylist",
  );

  let contentSeeder: ReactElement | null = null;
  if (sessionHasPermission(session, "content:read")) {
    const listRes = await serverFetchJson<unknown>({
      session,
      path: "content",
      searchParams: {
        page: PLAYLIST_CONTENT_PICKER_LIST_QUERY.page ?? 1,
        pageSize: PLAYLIST_CONTENT_PICKER_LIST_QUERY.pageSize ?? 100,
        status: PLAYLIST_CONTENT_PICKER_LIST_QUERY.status,
        sortBy: PLAYLIST_CONTENT_PICKER_LIST_QUERY.sortBy ?? "createdAt",
        sortDirection:
          PLAYLIST_CONTENT_PICKER_LIST_QUERY.sortDirection ?? "desc",
      },
      tags: ["content"],
      revalidate: 30,
    });
    if (listRes.ok) {
      const listData = transformPaginatedListResponse<BackendContent>(
        listRes.data,
        "listContent",
      );
      contentSeeder = (
        <ContentListCacheSeeder
          queryArgs={PLAYLIST_CONTENT_PICKER_LIST_QUERY}
          data={listData}
        />
      );
    }
  }

  return (
    <>
      <PlaylistDetailCacheSeeder playlistId={playlistId} data={playlistData} />
      {contentSeeder}
      <EditPlaylistPageView />
    </>
  );
}
