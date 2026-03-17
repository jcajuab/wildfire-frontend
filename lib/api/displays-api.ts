import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";

/** Backend display shape (matches GET /displays and GET /displays/:id). */
export interface Display {
  readonly id: string;
  readonly slug: string;
  readonly fingerprint?: string | null;
  readonly name: string;
  readonly location: string | null;
  readonly ipAddress: string | null;
  readonly macAddress: string | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
  readonly output: string | null;
  readonly orientation: "LANDSCAPE" | "PORTRAIT" | null;
  readonly emergencyContentId?: string | null;
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

export interface DisplaysListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly q?: string;
  readonly status?: "PROCESSING" | "READY" | "LIVE" | "DOWN";
  readonly groupIds?: readonly string[];
  readonly output?: string;
  readonly sortBy?: "name" | "status" | "location";
  readonly sortDirection?: "asc" | "desc";
}

export interface DisplayOption {
  readonly id: string;
  readonly name: string;
}

export type DisplayOutputOption = string;

export interface UpdateDisplayRequest {
  readonly id: string;
  readonly name?: string;
  readonly location?: string | null;
  readonly ipAddress?: string | null;
  readonly macAddress?: string | null;
  readonly screenWidth?: number | null;
  readonly screenHeight?: number | null;
  readonly output?: string | null;
  readonly orientation?: "LANDSCAPE" | "PORTRAIT" | null;
  readonly emergencyContentId?: string | null;
}

export interface DisplayGroup {
  readonly id: string;
  readonly name: string;
  readonly colorIndex: number;
  readonly displayIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
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

export interface DisplayRuntimeOverrides {
  readonly globalEmergency: {
    readonly active: boolean;
    readonly startedAt: string | null;
  };
}

const buildDisplaysListUrl = (query: DisplaysListQuery | void): string => {
  const params = new URLSearchParams();
  params.set("page", String(query?.page ?? 1));
  params.set("pageSize", String(query?.pageSize ?? 20));

  if (query?.q) {
    params.set("q", query.q);
  }
  if (query?.status) {
    params.set("status", query.status);
  }
  if (query?.output) {
    params.set("output", query.output);
  }
  if (query?.sortBy) {
    params.set("sortBy", query.sortBy);
  }
  if (query?.sortDirection) {
    params.set("sortDirection", query.sortDirection);
  }
  if (query?.groupIds) {
    for (const groupId of query.groupIds) {
      params.append("groupIds", groupId);
    }
  }

  return `displays?${params.toString()}`;
};

export const displaysApi = createApi({
  reducerPath: "displaysApi",
  baseQuery,
  tagTypes: ["Display", "DisplayGroup", "RuntimeOverrides"],
  endpoints: (build) => ({
    getDisplays: build.query<DisplaysListResponse, DisplaysListQuery | void>({
      query: (query) => buildDisplaysListUrl(query),
      transformResponse: (response) =>
        transformPaginatedListResponse<Display>(response, "getDisplays"),
      providesTags: createProvidesTags("Display"),
    }),
    getDisplayOptions: build.query<
      DisplayOption[],
      { q?: string; limit?: number } | void
    >({
      query: (query) => ({
        url: "displays/options",
        params: {
          q: query?.q,
          limit: query?.limit ?? 100,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayOption[]>(
          response,
          "getDisplayOptions",
        ),
    }),
    getDisplayOutputOptions: build.query<DisplayOutputOption[], void>({
      query: () => "displays/options/outputs",
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayOutputOption[]>(
          response,
          "getDisplayOutputOptions",
        ),
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
        url: "displays/runtime-overrides/emergency",
        method: "PUT",
        body: { active: true, ...((body as object) ?? {}) },
      }),
      invalidatesTags: [
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
      ],
    }),
    deactivateGlobalEmergency: build.mutation<void, { reason?: string } | void>(
      {
        query: (body) => ({
          url: "displays/runtime-overrides/emergency",
          method: "PUT",
          body: { active: false, ...((body as object) ?? {}) },
        }),
        invalidatesTags: [
          { type: "RuntimeOverrides", id: "GLOBAL" },
          { type: "Display", id: "LIST" },
        ],
      },
    ),
    getDisplayGroups: build.query<DisplayGroup[], void>({
      query: () => "displays/groups",
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup[]>(response, "getDisplayGroups"),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
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
  useGetDisplayOptionsQuery,
  useGetDisplayOutputOptionsQuery,
  useGetDisplayQuery,
  useLazyGetDisplayQuery,
  useUpdateDisplayMutation,
  useGetRuntimeOverridesQuery,
  useActivateGlobalEmergencyMutation,
  useDeactivateGlobalEmergencyMutation,
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
