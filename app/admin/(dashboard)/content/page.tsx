import type { ReactElement } from "react";

import type { BackendContentListItem } from "@/lib/api/content-api";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import {
  CONTENT_PAGE_SIZE,
  contentListQueryFromSearchParams,
} from "@/lib/content-search-params";
import { cacheLife, cacheTag } from "next/cache";

import {
  getCachedServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import { serverFetchJson } from "@/lib/server/api";

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
  ownerId?: string;
  search?: string;
}) {
  "use cache: private";
  cacheTag("wildfire:content-list");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
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

  const [sessionResult, listData] = await Promise.all([
    getCachedServerSession(),
    getCachedContentList({
      page: queryArgs.page ?? 1,
      pageSize: queryArgs.pageSize ?? CONTENT_PAGE_SIZE,
      sortBy: queryArgs.sortBy ?? "createdAt",
      sortDirection: queryArgs.sortDirection ?? "desc",
      status: queryArgs.status,
      type: queryArgs.type,
      ownerId: queryArgs.ownerId,
      search: queryArgs.search,
    }),
  ]);

  const session = resolveOptionalDashboardSession(sessionResult);
  if (!session) {
    return (
      <ContentPageView initialQueryArgs={queryArgs} initialData={undefined} />
    );
  }
  return (
    <ContentPageView
      initialQueryArgs={queryArgs}
      initialData={listData ?? undefined}
    />
  );
}
