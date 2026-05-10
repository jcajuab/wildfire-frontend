import type { ReactElement } from "react";

import type { ContentOption } from "@/lib/api/content-api";
import type { BackendPlaylistWithItems } from "@/lib/api/playlists-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import {
  getServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { ContentOptionsCacheSeeder } from "../../../content/content-page-client";
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
  const { id: playlistId } = await params;
  const editPath = getPlaylistEditPath(playlistId);

  const session = resolveOptionalDashboardSession(await getServerSession());
  if (!session) {
    return <EditPlaylistPageView />;
  }
  const playlistRes = await serverFetchJson<unknown>({
    session,
    path: `playlists/${encodeURIComponent(playlistId)}`,
    tags: ["playlists"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(playlistRes, editPath);

  const playlistData = parseApiResponseDataSafe<BackendPlaylistWithItems>(
    playlistRes.data,
    "getPlaylist",
  );

  let contentSeeder: ReactElement | null = null;
  if (sessionHasPermission(session, "content:read")) {
    const optionsRes = await serverFetchJson<unknown>({
      session,
      path: "content/options",
      searchParams: {
        status: PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY.status,
      },
      tags: ["content-options"],
      revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
    });
    if (optionsRes.ok) {
      const options = parseApiResponseDataSafe<ContentOption[]>(
        optionsRes.data,
        "getContentOptions",
      );
      contentSeeder = (
        <ContentOptionsCacheSeeder
          queryArgs={PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY}
          data={options}
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
