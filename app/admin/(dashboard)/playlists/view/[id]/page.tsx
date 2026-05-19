import type { ReactElement } from "react";

import type { BackendPlaylistWithItems } from "@/lib/api/playlists-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getPlaylistViewPath } from "@/lib/playlist-paths";
import {
  getServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";
import { PlaylistDetailCacheSeeder } from "../../edit/[id]/edit-playlist-page-client";
import { ViewPlaylistPageView } from "./view-playlist-page-client";

interface ViewPlaylistPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function ViewPlaylistPage({
  params,
}: ViewPlaylistPageProps): Promise<ReactElement> {
  const { id: playlistId } = await params;
  const viewPath = getPlaylistViewPath(playlistId);

  const session = resolveOptionalDashboardSession(await getServerSession());
  if (!session) {
    return <ViewPlaylistPageView playlistId={playlistId} />;
  }

  const playlistRes = await serverFetchJson<unknown>({
    session,
    path: `playlists/${encodeURIComponent(playlistId)}`,
    tags: ["playlists"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(playlistRes, viewPath);

  const playlistData = parseApiResponseDataSafe<BackendPlaylistWithItems>(
    playlistRes.data,
    "getPlaylist",
  );

  return (
    <>
      <PlaylistDetailCacheSeeder playlistId={playlistId} data={playlistData} />
      <ViewPlaylistPageView playlistId={playlistId} />
    </>
  );
}
