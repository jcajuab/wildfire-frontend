import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  DisplaysBootstrapResponse,
  DisplaysListQuery,
} from "@/lib/api/displays-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import {
  DISPLAYS_PAGE_SIZE,
  displaysBootstrapQueryFromSearchParams,
} from "@/lib/displays-search-params";
import type { ServerSearchParamValue } from "@/lib/server/api";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  DisplaysBootstrapCacheSeeder,
  DisplaysPageView,
} from "./displays-page-client";

interface DisplaysPageProps {
  readonly searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
}

function bootstrapSearchParamsRecord(
  queryArgs: DisplaysListQuery,
): Record<string, ServerSearchParamValue> {
  const record: Record<string, ServerSearchParamValue> = {
    page: queryArgs.page ?? 1,
    pageSize: queryArgs.pageSize ?? DISPLAYS_PAGE_SIZE,
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

export default async function DisplaysPage({
  searchParams,
}: DisplaysPageProps): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/displays")}`);
  }
  if (!sessionHasPermission(session, "displays:read")) {
    redirect("/unauthorized");
  }

  const sp = (await searchParams) ?? {};
  const queryArgs = displaysBootstrapQueryFromSearchParams(sp);

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: "displays/bootstrap",
    searchParams: bootstrapSearchParamsRecord(queryArgs),
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
    <>
      <DisplaysBootstrapCacheSeeder
        queryArgs={queryArgs}
        data={bootstrapData}
      />
      <DisplaysPageView />
    </>
  );
}
