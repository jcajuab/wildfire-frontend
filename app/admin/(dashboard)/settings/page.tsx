import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import type { AICredential } from "@/lib/api/ai-credentials-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { getServerSession } from "@/lib/server/auth";
import { serverFetchJson } from "@/lib/server/api";

import {
  AICredentialsCacheSeeder,
  SettingsPageView,
} from "./settings-page-client";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?redirectTo=%2Fadmin%2Fsettings");
  }

  const credentialsRes = await serverFetchJson<unknown>({
    session,
    path: "ai/credentials",
    tags: ["ai"],
    revalidate: 30,
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
