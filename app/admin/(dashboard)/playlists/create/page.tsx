import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { ContentOption } from "@/lib/api/content-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY } from "@/lib/content-search-params";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { getServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { ContentOptionsCacheSeeder } from "../../content/content-page-client";
import { CreatePlaylistPageView } from "./create-playlist-page-client";

const CREATE_REDIRECT = `${PLAYLIST_INDEX_PATH}/create`;

export default async function CreatePlaylistPage(): Promise<ReactElement> {
  const session = resolveSession(await getServerSession(), CREATE_REDIRECT);
  if (!session) {
    return <CreatePlaylistPageView />;
  }
  if (!sessionHasPermission(session, "playlists:create")) {
    redirect("/unauthorized");
  }

  let contentSeeder: ReactElement | null = null;
  if (sessionHasPermission(session, "content:read")) {
    const optionsRes = await serverFetchJson<unknown>({
      session,
      path: "content/options",
      searchParams: {
        status: PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY.status,
      },
      tags: ["content-options"],
      revalidate: 86400,
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
      {contentSeeder}
      <CreatePlaylistPageView />
    </>
  );
}
