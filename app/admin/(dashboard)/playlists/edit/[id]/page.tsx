import type { ReactElement } from "react";

import type { BackendPlaylistWithItems } from "@/lib/api/playlists-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import {
  getServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

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

  return (
    <>
      <PlaylistDetailCacheSeeder playlistId={playlistId} data={playlistData} />
      <EditPlaylistPageView />
    </>
  );
}
