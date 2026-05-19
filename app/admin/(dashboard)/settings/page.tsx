import type { ReactElement } from "react";
import type { AICredential } from "@/lib/api/ai-credentials-api";
import type { MaintenanceSettings } from "@/lib/api/maintenance-settings-api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import {
  getCachedServerSession,
  resolveOptionalDashboardSession,
} from "@/lib/server/auth";
import {
  handleBootstrapResult,
  serverFetchJson,
  sessionHasPermission,
  WILDFIRE_SERVER_REVALIDATE_SECONDS,
} from "@/lib/server/api";

import {
  AICredentialsCacheSeeder,
  MaintenanceSettingsCacheSeeder,
  SettingsPageView,
} from "./settings-page-client";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = resolveOptionalDashboardSession(
    await getCachedServerSession(),
  );
  if (!session) {
    return (
      <SettingsPageView
        canManageAICredentials={false}
        canManageMaintenance={false}
        initialMaintenanceSettings={null}
      />
    );
  }

  const canManageAICredentials = sessionHasPermission(session, "ai:access");
  const canManageMaintenance = session.user.isAdmin === true;
  let credentials: AICredential[] | null = null;
  let maintenanceSettings: MaintenanceSettings | null = null;

  const [credentialsRes, maintenanceRes] = await Promise.all([
    canManageAICredentials
      ? serverFetchJson<unknown>({
          session,
          path: "ai/credentials",
          tags: ["ai"],
          revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
        })
      : Promise.resolve(null),
    canManageMaintenance
      ? serverFetchJson<unknown>({
          session,
          path: "settings/maintenance",
          tags: ["settings"],
          revalidate: WILDFIRE_SERVER_REVALIDATE_SECONDS,
        })
      : Promise.resolve(null),
  ]);

  if (credentialsRes) {
    handleBootstrapResult(credentialsRes, "/admin/settings");
    credentials = parseApiResponseDataSafe<AICredential[]>(
      credentialsRes.data,
      "getAICredentials",
    );
  }

  if (maintenanceRes) {
    handleBootstrapResult(maintenanceRes, "/admin/settings");
    maintenanceSettings = parseApiResponseDataSafe<MaintenanceSettings>(
      maintenanceRes.data,
      "getMaintenanceSettings",
    );
  }

  return (
    <>
      {credentials ? <AICredentialsCacheSeeder data={credentials} /> : null}
      {maintenanceSettings ? (
        <MaintenanceSettingsCacheSeeder data={maintenanceSettings} />
      ) : null}
      <SettingsPageView
        canManageAICredentials={canManageAICredentials}
        canManageMaintenance={canManageMaintenance}
        initialMaintenanceSettings={maintenanceSettings}
      />
    </>
  );
}
