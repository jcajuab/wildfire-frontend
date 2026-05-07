import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  DisplaysBootstrapResponse,
  DisplaysListQuery,
} from "@/lib/api/displays-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import { cacheLife, cacheTag } from "next/cache";

import type { ServerSearchParamValue } from "@/lib/server/api";
import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

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

async function getCachedDisplaysBootstrap(): Promise<DisplaysBootstrapResponse | null> {
  "use cache: private";
  cacheTag("wildfire:displays-bootstrap");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "displays/bootstrap",
    searchParams: bootstrapSearchParamsRecord(INITIAL_DISPLAYS_BOOTSTRAP_QUERY),
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

export default async function DisplaysPage(): Promise<ReactElement> {
  const [sessionResult, bootstrapData] = await Promise.all([
    getCachedServerSession(),
    getCachedDisplaysBootstrap(),
  ]);

  const session = resolveSession(sessionResult, "/admin/displays");
  if (!session) {
    return (
      <DisplaysPageView
        initialQueryArgs={INITIAL_DISPLAYS_BOOTSTRAP_QUERY}
        initialData={undefined}
      />
    );
  }
  if (!sessionHasPermission(session, "displays:read")) {
    redirect("/unauthorized");
  }

  return (
    <DisplaysPageView
      initialQueryArgs={INITIAL_DISPLAYS_BOOTSTRAP_QUERY}
      initialData={bootstrapData ?? undefined}
    />
  );
}
