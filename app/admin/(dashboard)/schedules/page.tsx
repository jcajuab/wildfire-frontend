import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  ScheduleWindowQuery,
  SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { defaultSchedulesBootstrapWindow } from "@/lib/schedule-window";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  SchedulesBootstrapCacheSeeder,
  SchedulesPageView,
} from "./schedules-page-client";

export default async function SchedulesPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/schedules")}`);
  }
  if (!sessionHasPermission(session, "schedules:read")) {
    redirect("/unauthorized");
  }

  const queryArgs: ScheduleWindowQuery = defaultSchedulesBootstrapWindow();

  const bootstrapRes = await serverFetchJson<unknown>({
    session,
    path: "schedules/bootstrap",
    searchParams: {
      from: queryArgs.from,
      to: queryArgs.to,
    },
    tags: ["schedules-bootstrap"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  if (!bootstrapRes.ok) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/schedules")}`);
  }

  const bootstrapData = parseApiResponseDataSafe<SchedulesBootstrapResponse>(
    bootstrapRes.data,
    "getSchedulesBootstrap",
  );

  return (
    <>
      <SchedulesBootstrapCacheSeeder
        queryArgs={queryArgs}
        data={bootstrapData}
      />
      <SchedulesPageView />
    </>
  );
}
