import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { BackendContentListItem } from "@/lib/api/content-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  CONTENT_PAGE_SIZE,
  contentListQueryFromSearchParams,
} from "@/lib/content-search-params";
import { cacheLife, cacheTag } from "next/cache";

import {
  getCachedServerSession,
  getServerSession,
  resolveSession,
} from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import { ContentPageView } from "./content-page-client";

interface ContentPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

async function getCachedContentList(params: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  status?: string;
  type?: string;
  search?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:content-list");
  cacheLife("dashboard");

  const sessionResult = await getServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "content",
    searchParams: params,
    revalidate: false,
  });

  if (!res.ok) return null;
  return transformPaginatedListResponse<BackendContentListItem>(
    res.data,
    "listContent",
  );
}

export default async function ContentPage({
  searchParams,
}: ContentPageProps): Promise<ReactElement> {
  const sp = (await searchParams) ?? {};
  const queryArgs = contentListQueryFromSearchParams(sp);

  const session = resolveSession(await getCachedServerSession(), "/admin/content");
  if (!session) {
    return (
      <ContentPageView initialQueryArgs={queryArgs} initialData={undefined} />
    );
  }
  if (!sessionHasPermission(session, "content:read")) {
    redirect("/unauthorized");
  }

  const listData = await getCachedContentList({
    page: queryArgs.page ?? 1,
    pageSize: queryArgs.pageSize ?? CONTENT_PAGE_SIZE,
    sortBy: queryArgs.sortBy ?? "createdAt",
    sortDirection: queryArgs.sortDirection ?? "desc",
    status: queryArgs.status,
    type: queryArgs.type,
    search: queryArgs.search,
  });

  return (
    <ContentPageView
      initialQueryArgs={queryArgs}
      initialData={listData ?? undefined}
    />
  );
}
