import type { ReactElement } from "react";
import { cacheLife, cacheTag } from "next/cache";

import type {
  DisplaysBootstrapResponse,
  DisplaysListQuery,
} from "@/lib/api/displays-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import type { ServerSearchParamValue } from "@/lib/server/api";
import {
  getCachedServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import { serverFetchJson } from "@/lib/server/api";

import { DisplayGroupsPageClient } from "./display-groups-page-client";

export const DISPLAY_GROUPS_BOOTSTRAP_QUERY: DisplaysListQuery = {
  page: 1,
  pageSize: DISPLAYS_BOOTSTRAP_PAGE_SIZE,
  sortBy: "name",
  sortDirection: "asc",
};

function bootstrapSearchParams(
  query: DisplaysListQuery,
): Record<string, ServerSearchParamValue> {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DISPLAYS_BOOTSTRAP_PAGE_SIZE,
    sortBy: query.sortBy ?? "name",
    sortDirection: query.sortDirection ?? "asc",
  };
}

async function getCachedBootstrap(): Promise<DisplaysBootstrapResponse | null> {
  "use cache: private";
  cacheTag("wildfire:displays-bootstrap");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "displays/bootstrap",
    searchParams: bootstrapSearchParams(DISPLAY_GROUPS_BOOTSTRAP_QUERY),
    revalidate: false,
  });

  if (!res.ok) return null;
  return (
    parseApiResponseDataSafe<DisplaysBootstrapResponse>(
      res.data,
      "getDisplaysBootstrap",
    ) ?? null
  );
}

export default async function DisplayGroupsPage(): Promise<ReactElement> {
  const [sessionResult, bootstrapData] = await Promise.all([
    getCachedServerSession(),
    getCachedBootstrap(),
  ]);

  const session = resolveOptionalDashboardSession(sessionResult);
  if (!session) {
    return <DisplayGroupsPageClient />;
  }
  return (
    <DisplayGroupsPageClient
      initialQueryArgs={DISPLAY_GROUPS_BOOTSTRAP_QUERY}
      initialData={bootstrapData ?? undefined}
    />
  );
}
