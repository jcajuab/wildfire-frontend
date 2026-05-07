import type { ReactElement } from "react";
import type { AICredential } from "@/lib/api/ai-credentials-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getCachedServerSession, resolveSession } from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  AICredentialsCacheSeeder,
  SettingsPageView,
} from "./settings-page-client";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = resolveSession(await getCachedServerSession(), "/admin/settings");
  if (!session) {
    return <SettingsPageView canManageAICredentials={false} />;
  }

  const canManageAICredentials = sessionHasPermission(session, "ai:access");
  let credentials: AICredential[] | null = null;

  if (canManageAICredentials) {
    const credentialsRes = await serverFetchJson<unknown>({
      session,
      path: "ai/credentials",
      tags: ["ai"],
      revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
    });
    handleBootstrapResult(credentialsRes, "/admin/settings");

    credentials = parseApiResponseDataSafe<AICredential[]>(
      credentialsRes.data,
      "getAICredentials",
    );
  }

  return (
    <>
      {credentials ? <AICredentialsCacheSeeder data={credentials} /> : null}
      <SettingsPageView canManageAICredentials={canManageAICredentials} />
    </>
  );
}
