import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendContentListItem } from "@/lib/api/content-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  CONTENT_PAGE_SIZE,
  contentListQueryFromSearchParams,
} from "@/lib/content-search-params";
import { getServerSession, resolveSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { ContentPageView } from "./content-page-client";

interface ContentPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function ContentPage({
  searchParams,
}: ContentPageProps): Promise<ReactElement> {
  const sp = (await searchParams) ?? {};
  const queryArgs = contentListQueryFromSearchParams(sp);

  const session = resolveSession(await getServerSession(), "/admin/content");
  if (!session) {
    return (
      <ContentPageView initialQueryArgs={queryArgs} initialData={undefined} />
    );
  }
  if (!sessionHasPermission(session, "content:read")) {
    redirect("/unauthorized");
  }

  const listRes = await serverFetchJson<unknown>({
    session,
    path: "content",
    searchParams: {
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? CONTENT_PAGE_SIZE,
      status: queryArgs.status,
      type: queryArgs.type,
      search: queryArgs.search,
      sortBy: queryArgs.sortBy ?? "createdAt",
      sortDirection: queryArgs.sortDirection ?? "desc",
    },
    tags: ["content-list"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(listRes, "/admin/content");

  const listData = transformPaginatedListResponse<BackendContentListItem>(
    listRes.data,
    "listContent",
  );

  return (
    <ContentPageView initialQueryArgs={queryArgs} initialData={listData} />
  );
}
