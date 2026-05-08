import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type {
  ScheduleWindowQuery,
  SchedulesBootstrapResponse,
} from "@/lib/api/schedules-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { defaultSchedulesBootstrapWindow } from "@/lib/schedule-window";
import { cacheLife, cacheTag } from "next/cache";

import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import { serverFetchJson, sessionHasPermission } from "@/lib/server/api";

import {
  SchedulesBootstrapCacheSeeder,
  SchedulesPageView,
} from "./schedules-page-client";

async function getCachedSchedulesBootstrap(from: string, to: string) {
  "use cache: private";
  cacheTag("wildfire:schedules-bootstrap");
  cacheLife("dashboard");

  const sessionResult = await getCachedServerSession();
  if (sessionResult.status !== "ok") return null;

  const res = await serverFetchJson<unknown>({
    session: sessionResult.session,
    path: "schedules/bootstrap",
    searchParams: { from, to },
    revalidate: false,
  });

  if (!res.ok) return null;
  return (
    parseApiResponseDataSafe<SchedulesBootstrapResponse>(
      res.data,
      "getSchedulesBootstrap",
    ) ?? null
  );
}

export default async function SchedulesPage(): Promise<ReactElement> {
  const session = resolveSession(
    await getCachedServerSession(),
    "/admin/schedules",
  );
  if (!session) {
    return <SchedulesPageView />;
  }
  if (!sessionHasPermission(session, "schedules:read")) {
    redirect("/unauthorized");
  }

  const queryArgs: ScheduleWindowQuery = defaultSchedulesBootstrapWindow();
  const bootstrapData = await getCachedSchedulesBootstrap(
    queryArgs.from,
    queryArgs.to,
  );

  return (
    <>
      {bootstrapData ? (
        <SchedulesBootstrapCacheSeeder
          queryArgs={queryArgs}
          data={bootstrapData}
        />
      ) : null}
      <SchedulesPageView />
    </>
  );
}
