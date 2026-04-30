import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  BackendContent,
  BackendContentListResponse,
} from "@/lib/api/content-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  CONTENT_PAGE_SIZE,
  contentListQueryFromSearchParams,
} from "@/lib/content-search-params";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import {
  ContentListCacheSeeder,
  ContentPageView,
} from "./content-page-client";

interface ContentPageProps {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContentPage({
  searchParams,
}: ContentPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?redirectTo=%2Fadmin%2Fcontent");
  }
  if (!sessionHasPermission(session, "content:read")) {
    redirect("/unauthorized");
  }

  const sp = (await searchParams) ?? {};
  const queryArgs = contentListQueryFromSearchParams(sp);

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
    tags: ["content"],
    revalidate: 30,
  });

  if (!listRes.ok) {
    redirect("/login?redirectTo=%2Fadmin%2Fcontent");
  }

  const listData = transformPaginatedListResponse<BackendContent>(
    listRes.data,
    "listContent",
  );

  return (
    <>
      <ContentListCacheSeeder queryArgs={queryArgs} data={listData} />
      <ContentPageView />
    </>
  );
}
