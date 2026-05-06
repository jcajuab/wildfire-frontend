import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  DisplaysBootstrapResponse,
  DisplaysListQuery,
} from "@/lib/api/displays-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import type { ServerSearchParamValue } from "@/lib/server/api";
import { getServerSession, resolveSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

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

export default async function DisplayGroupsPage(): Promise<ReactElement> {
  const session = resolveSession(
    await getServerSession(),
    "/admin/displays/display-groups",
  );
  if (!session) {
    return <DisplayGroupsPageClient />;
  }
  if (!sessionHasPermission(session, "displays:read")) {
    redirect("/unauthorized");
  }

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: "displays/bootstrap",
    searchParams: bootstrapSearchParams(DISPLAY_GROUPS_BOOTSTRAP_QUERY),
    tags: ["displays-bootstrap"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(bootstrapRes, "/admin/displays/display-groups");

  const bootstrapData = parseApiResponseDataSafe<DisplaysBootstrapResponse>(
    bootstrapRes.data,
    "getDisplaysBootstrap",
  );

  return (
    <DisplayGroupsPageClient
      initialQueryArgs={DISPLAY_GROUPS_BOOTSTRAP_QUERY}
      initialData={bootstrapData ?? undefined}
    />
  );
}
