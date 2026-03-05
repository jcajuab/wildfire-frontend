import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
  parseApiListResponse,
} from "@/lib/api/contracts";

/** Backend display shape (matches GET /displays and GET /displays/:id). */
export interface Display {
  readonly id: string;
  readonly displaySlug?: string;
  readonly identifier: string;
  readonly displayFingerprint?: string | null;
  readonly name: string;
  readonly location: string | null;
  readonly ipAddress: string | null;
  readonly macAddress: string | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
  readonly outputType: string | null;
  readonly orientation: "LANDSCAPE" | "PORTRAIT" | null;
  readonly emergencyContentId?: string | null;
  readonly localEmergencyActive?: boolean;
  readonly localEmergencyStartedAt?: string | null;
  readonly lastSeenAt: string | null;
  readonly status: "PROCESSING" | "READY" | "LIVE" | "DOWN";
  readonly nowPlaying?: {
    readonly title: string | null;
    readonly playlist: string | null;
    readonly progress: number;
    readonly duration: number;
  } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisplaysListResponse {
  readonly items: readonly Display[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface UpdateDisplayRequest {
  readonly id: string;
  readonly name?: string;
  readonly location?: string | null;
  readonly ipAddress?: string | null;
  readonly macAddress?: string | null;
  readonly screenWidth?: number | null;
  readonly screenHeight?: number | null;
  readonly outputType?: string | null;
  readonly orientation?: "LANDSCAPE" | "PORTRAIT" | null;
  readonly emergencyContentId?: string | null;
}

export interface DisplayGroup {
  readonly id: string;
  readonly name: string;
  /** Optional: backend may not send; use 0 for badge styling when missing. */
  readonly colorIndex?: number;
  readonly displayIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisplayGroupsListResponse {
  readonly items: readonly DisplayGroup[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface DisplayRegistrationAttemptResponse {
  readonly attemptId: string;
  readonly code: string;
  readonly expiresAt: string;
}

export interface DisplayRegistrationAttemptRotateResponse {
  readonly code: string;
  readonly expiresAt: string;
}

export interface DisplayRuntimeFlashOverride {
  readonly active: boolean;
  readonly activationId: string;
  readonly targetDisplayId: string;
  readonly message: string;
  readonly tone: "INFO" | "WARNING" | "CRITICAL";
  readonly startedAt: string;
  readonly endsAt: string;
}

export interface DisplayRuntimeOverrides {
  readonly globalEmergency: {
    readonly active: boolean;
    readonly startedAt: string | null;
  };
  readonly flash: DisplayRuntimeFlashOverride | null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const buildResponseParseError = (scope: string, error: unknown) => ({
  error: {
    code: "INVALID_API_RESPONSE",
    message:
      error instanceof Error
        ? `${scope}: ${error.message}`
        : "Response payload does not match API contract.",
  },
});

export const displaysApi = createApi({
  reducerPath: "displaysApi",
  baseQuery,
  tagTypes: ["Display", "DisplayGroup", "RuntimeOverrides"],
  endpoints: (build) => ({
    getDisplays: build.query<DisplaysListResponse, void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        const pageSize = PAGE_SIZE;
        let page = 1;
        let total = 0;
        const allItems: Display[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: {
                status: 500,
                data: "Failed to load displays: pagination limit reached.",
              },
            };
          }
          const result = await baseQueryFn({
            url: "displays",
            params: { page, pageSize },
          });
          if (result.error) {
            return { error: result.error };
          }

          let response: ReturnType<typeof parseApiListResponse<Display>>;
          try {
            response = parseApiListResponseSafe<Display>(
              result.data,
              "getDisplays",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getDisplays", error),
              },
            };
          }
          const pageData = response.data;
          total = response.meta.total;
          allItems.push(...pageData);

          if (allItems.length >= total || pageData.length === 0) {
            break;
          }
          page += 1;
        }

        return {
          data: {
            items: allItems,
            total,
            page: 1,
            pageSize: PAGE_SIZE,
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Display" as const,
                id,
              })),
              { type: "Display", id: "LIST" },
            ]
          : [{ type: "Display", id: "LIST" }],
    }),
    getDisplay: build.query<Display, string>({
      query: (id) => `displays/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<Display>(response, "getDisplay"),
      providesTags: (_result, _error, id) => [{ type: "Display", id }],
    }),
    updateDisplay: build.mutation<Display, UpdateDisplayRequest>({
      query: ({ id, ...body }) => ({
        url: `displays/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<Display>(response, "updateDisplay"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id },
      ],
    }),
    getRuntimeOverrides: build.query<DisplayRuntimeOverrides, void>({
      query: () => "displays/runtime-overrides",
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayRuntimeOverrides>(
          response,
          "getRuntimeOverrides",
        ),
      providesTags: [{ type: "RuntimeOverrides", id: "GLOBAL" }],
    }),
    activateGlobalEmergency: build.mutation<void, { reason?: string } | void>({
      query: (body) => ({
        url: "displays/runtime-overrides/emergency/activate",
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: [
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
      ],
    }),
    deactivateGlobalEmergency: build.mutation<void, { reason?: string } | void>(
      {
        query: (body) => ({
          url: "displays/runtime-overrides/emergency/deactivate",
          method: "POST",
          body: body ?? {},
        }),
        invalidatesTags: [
          { type: "RuntimeOverrides", id: "GLOBAL" },
          { type: "Display", id: "LIST" },
        ],
      },
    ),
    activateDisplayEmergency: build.mutation<
      void,
      { displayId: string; reason?: string }
    >({
      query: ({ displayId, reason }) => ({
        url: `displays/${displayId}/emergency/activate`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
      ],
    }),
    deactivateDisplayEmergency: build.mutation<
      void,
      { displayId: string; reason?: string }
    >({
      query: ({ displayId, reason }) => ({
        url: `displays/${displayId}/emergency/deactivate`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
      ],
    }),
    getDisplayGroups: build.query<DisplayGroupsListResponse, void>({
      query: () => "displays/groups",
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<DisplayGroup>(
          response,
          "getDisplayGroups",
        );
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.per_page,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "DisplayGroup" as const,
                id,
              })),
              { type: "DisplayGroup", id: "LIST" },
            ]
          : [{ type: "DisplayGroup", id: "LIST" }],
    }),
    createDisplayGroup: build.mutation<
      DisplayGroup,
      { name: string; colorIndex?: number }
    >({
      query: (body) => ({
        url: "displays/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "createDisplayGroup"),
      invalidatesTags: [{ type: "DisplayGroup", id: "LIST" }],
    }),
    updateDisplayGroup: build.mutation<
      DisplayGroup,
      { groupId: string; name: string; colorIndex?: number }
    >({
      query: ({ groupId, name, colorIndex }) => ({
        url: `displays/groups/${groupId}`,
        method: "PATCH",
        body: { name, colorIndex },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "updateDisplayGroup"),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DisplayGroup", id: "LIST" },
        { type: "DisplayGroup", id: groupId },
        { type: "Display", id: "LIST" },
      ],
    }),
    deleteDisplayGroup: build.mutation<void, { groupId: string }>({
      query: ({ groupId }) => ({
        url: `displays/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DisplayGroup", id: "LIST" },
        { type: "DisplayGroup", id: groupId },
        { type: "Display", id: "LIST" },
      ],
    }),
    setDisplayGroups: build.mutation<
      void,
      { displayId: string; groupIds: string[] }
    >({
      query: ({ displayId, groupIds }) => ({
        url: `displays/${displayId}/groups`,
        method: "PUT",
        body: { groupIds },
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
        { type: "DisplayGroup", id: "LIST" },
      ],
    }),
    unregisterDisplay: build.mutation<void, { displayId: string }>({
      query: ({ displayId }) => ({
        url: `displays/${displayId}/unregister`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
      ],
    }),
    createRegistrationAttempt: build.mutation<
      DisplayRegistrationAttemptResponse,
      void
    >({
      query: () => ({
        url: "displays/registration-attempts",
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayRegistrationAttemptResponse>(
          response,
          "createRegistrationAttempt",
        ),
    }),
    rotateRegistrationAttempt: build.mutation<
      DisplayRegistrationAttemptRotateResponse,
      { attemptId: string }
    >({
      query: ({ attemptId }) => ({
        url: `displays/registration-attempts/${attemptId}/rotate`,
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayRegistrationAttemptRotateResponse>(
          response,
          "rotateRegistrationAttempt",
        ),
    }),
    closeRegistrationAttempt: build.mutation<void, { attemptId: string }>({
      query: ({ attemptId }) => ({
        url: `displays/registration-attempts/${attemptId}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useGetDisplaysQuery,
  useGetDisplayQuery,
  useLazyGetDisplayQuery,
  useUpdateDisplayMutation,
  useGetRuntimeOverridesQuery,
  useActivateGlobalEmergencyMutation,
  useDeactivateGlobalEmergencyMutation,
  useActivateDisplayEmergencyMutation,
  useDeactivateDisplayEmergencyMutation,
  useGetDisplayGroupsQuery,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  useDeleteDisplayGroupMutation,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useCreateRegistrationAttemptMutation,
  useRotateRegistrationAttemptMutation,
  useCloseRegistrationAttemptMutation,
} = displaysApi;
