import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendContent } from "@/lib/api/content-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  PLAYLIST_CONTENT_PICKER_LIST_QUERY,
} from "@/lib/content-search-params";
import { PLAYLIST_INDEX_PATH } from "@/lib/playlist-paths";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { ContentListCacheSeeder } from "../../content/content-page-client";
import { CreatePlaylistPageView } from "./create-playlist-page-client";

const CREATE_REDIRECT = `${PLAYLIST_INDEX_PATH}/create`;

export default async function CreatePlaylistPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent(CREATE_REDIRECT)}`);
  }
  if (!sessionHasPermission(session, "playlists:create")) {
    redirect("/unauthorized");
  }

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
        sortDirection: PLAYLIST_CONTENT_PICKER_LIST_QUERY.sortDirection ?? "desc",
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
      {contentSeeder}
      <CreatePlaylistPageView />
    </>
  );
}
