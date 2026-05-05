import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { AICredential } from "@/lib/api/ai-credentials-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getServerSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  AICredentialsCacheSeeder,
  SettingsPageView,
} from "./settings-page-client";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent("/admin/settings")}`);
  }

  const credentialsRes = await serverFetchJson<unknown>({
    session,
    path: "ai/credentials",
    tags: ["ai"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });
  handleBootstrapResult(credentialsRes, "/admin/settings");

  const credentials = parseApiResponseDataSafe<AICredential[]>(
    credentialsRes.data,
    "getAICredentials",
  );

  return (
    <>
      <AICredentialsCacheSeeder data={credentials} />
      <SettingsPageView />
    </>
  );
}
