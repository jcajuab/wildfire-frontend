import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  DisplaysBootstrapResponse,
  DisplaysListQuery,
} from "@/lib/api/displays-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import {
  DISPLAYS_BOOTSTRAP_PAGE_SIZE,
} from "@/lib/displays-search-params";
import type { ServerSearchParamValue } from "@/lib/server/api";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { DisplaysPageView } from "./displays-page-client";

const INITIAL_DISPLAYS_BOOTSTRAP_QUERY: DisplaysListQuery = {
  page: 1,
  pageSize: DISPLAYS_BOOTSTRAP_PAGE_SIZE,
  sortBy: "name",
  sortDirection: "asc",
};

function bootstrapSearchParamsRecord(
  queryArgs: DisplaysListQuery,
): Record<string, ServerSearchParamValue> {
  const record: Record<string, ServerSearchParamValue> = {
    page: queryArgs.page ?? 1,
    pageSize: queryArgs.pageSize ?? DISPLAYS_BOOTSTRAP_PAGE_SIZE,
  };
  if (queryArgs.q) record.q = queryArgs.q;
  if (queryArgs.status) record.status = queryArgs.status;
  if (queryArgs.output) record.output = queryArgs.output;
  if (queryArgs.sortBy) record.sortBy = queryArgs.sortBy;
  if (queryArgs.sortDirection) record.sortDirection = queryArgs.sortDirection;
  if (queryArgs.groupNames && queryArgs.groupNames.length > 0) {
    record.groupNames = queryArgs.groupNames;
  }
  return record;
}

export default async function DisplaysPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/displays")}`);
  }
  if (!sessionHasPermission(session, "displays:read")) {
    redirect("/unauthorized");
  }

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: "displays/bootstrap",
    searchParams: bootstrapSearchParamsRecord(INITIAL_DISPLAYS_BOOTSTRAP_QUERY),
    tags: ["displays-bootstrap"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  if (!bootstrapRes.ok) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/displays")}`);
  }

  const bootstrapData = parseApiResponseDataSafe<DisplaysBootstrapResponse>(
    bootstrapRes.data,
    "getDisplaysBootstrap",
  );

  return (
    <DisplaysPageView
      initialQueryArgs={INITIAL_DISPLAYS_BOOTSTRAP_QUERY}
      initialData={bootstrapData}
    />
  );
}
