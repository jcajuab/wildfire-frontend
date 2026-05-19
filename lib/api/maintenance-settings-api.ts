import { revalidateWildfireTagViaRoute } from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";

export interface MaintenanceSettings {
  readonly autoDeleteFinishedSchedules: {
    readonly enabled: boolean;
    readonly retentionDays: number;
  };
  readonly autoDeleteAuditLogs: {
    readonly enabled: boolean;
    readonly retentionDays: number;
  };
  readonly updatedAt: string;
}

export type UpdateMaintenanceSettingsRequest = Omit<
  MaintenanceSettings,
  "updatedAt"
>;

async function bumpMaintenanceSettingsCache(): Promise<void> {
  try {
    await revalidateWildfireTagViaRoute("settings");
  } catch {
    // best-effort
  }
}

export const maintenanceSettingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMaintenanceSettings: build.query<MaintenanceSettings, void>({
      query: () => "settings/maintenance",
      transformResponse: (response) =>
        parseApiResponseDataSafe<MaintenanceSettings>(
          response,
          "getMaintenanceSettings",
        ),
      providesTags: [{ type: "MaintenanceSettings", id: "SINGLE" }],
    }),
    updateMaintenanceSettings: build.mutation<
      MaintenanceSettings,
      UpdateMaintenanceSettingsRequest
    >({
      query: (body) => ({
        url: "settings/maintenance",
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<MaintenanceSettings>(
          response,
          "updateMaintenanceSettings",
        ),
      invalidatesTags: [{ type: "MaintenanceSettings", id: "SINGLE" }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpMaintenanceSettingsCache();
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useGetMaintenanceSettingsQuery,
  useUpdateMaintenanceSettingsMutation,
} = maintenanceSettingsApi;
