import type { ReactElement } from "react";

import type { AICredential } from "@/lib/api/ai-credentials-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getServerSession } from "@/lib/server/auth";
import {
  serverFetchJson,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import { AuthGate } from "@/app/admin/auth-gate";
import {
  AICredentialsCacheSeeder,
  SettingsPageView,
} from "./settings-page-client";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    return <AuthGate redirectTo="/admin/settings" />;
  }

  const credentialsRes = await serverFetchJson<unknown>({
    session,
    path: "ai/credentials",
    tags: ["ai"],
    revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  });

  let credentialsSeeder: ReactElement | null = null;
  if (credentialsRes.ok) {
    const credentials = parseApiResponseDataSafe<AICredential[]>(
      credentialsRes.data,
      "getAICredentials",
    );
    credentialsSeeder = <AICredentialsCacheSeeder data={credentials} />;
  }

  return (
    <>
      {credentialsSeeder}
      <SettingsPageView />
    </>
  );
}
