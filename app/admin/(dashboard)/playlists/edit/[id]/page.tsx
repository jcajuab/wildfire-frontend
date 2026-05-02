import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { ContentOption } from "@/lib/api/content-api";
import type { BackendPlaylistWithItems } from "@/lib/api/playlists-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import { getPlaylistEditPath } from "@/lib/playlist-paths";
import { getServerSession } from "@/lib/server/auth";
import {
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
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
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
