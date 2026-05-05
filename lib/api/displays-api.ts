import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";

async function bumpDisplaysNextCache(): Promise<void> {
  try {
    await revalidateWildfireTagsViaRoute([
      "displays-bootstrap",
      "displays-options",
    ]);
  } catch {
    // Next cache revalidation is best-effort
  }
}

/** Backend display shape (matches GET /displays and GET /displays/:id). */
export interface BackendDisplay {
  readonly id: string;
  readonly slug: string;
  readonly fingerprint?: string | null;
  readonly name: string;
  readonly output: string;
  readonly lastSeenAt: string | null;
  readonly status: "PROCESSING" | "READY" | "LIVE" | "DOWN";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisplaysListResponse {
  readonly items: readonly BackendDisplay[];
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
  readonly groupNames?: readonly string[];
  readonly output?: string;
  readonly sortBy?: "name" | "status";
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
  readonly output?: string;
}

export interface DisplayGroup {
  readonly id: string;
  readonly name: string;
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

export interface CreateRegistrationLinkRequest {
  readonly slug: string;
  readonly displayName: string;
  readonly outputType: string;
  readonly outputIndex: number;
  readonly displayGroups: string[];
}

export interface CreateRegistrationLinkResponse {
  readonly token: string;
  readonly attemptId: string;
  readonly expiresAt: string;
}

export interface DisplayRuntimeOverrides {
  readonly globalEmergency: {
    readonly active: boolean;
    readonly startedAt: string | null;
    readonly activeSlotIndex: number | null;
  };
}

export interface DisplaysBootstrapResponse {
  readonly displays: DisplaysListResponse;
  readonly displayGroups: DisplayGroup[];
  readonly displayOutputOptions: DisplayOutputOption[];
  readonly runtimeOverrides: DisplayRuntimeOverrides;
}

type DisplaysListMutable = {
  items: BackendDisplay[];
  total: number;
  page: number;
  pageSize: number;
};

type DisplaysBootstrapMutable = {
  displays: DisplaysListMutable;
  displayGroups: DisplayGroup[];
  displayOutputOptions: DisplayOutputOption[];
  runtimeOverrides: {
    globalEmergency: {
      active: boolean;
      startedAt: string | null;
      activeSlotIndex: number | null;
    };
  };
};

export const displaysApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDisplays: build.query<DisplaysListResponse, DisplaysListQuery | void>({
      query: (query) => {
        const params = new URLSearchParams();
        params.set("page", String(query?.page ?? 1));
        params.set("pageSize", String(query?.pageSize ?? 20));
        if (query?.q) params.set("q", query.q);
        if (query?.status) params.set("status", query.status);
        if (query?.output) params.set("output", query.output);
        if (query?.sortBy) params.set("sortBy", query.sortBy);
        if (query?.sortDirection)
          params.set("sortDirection", query.sortDirection);
        if (query?.groupIds) {
          for (const groupId of query.groupIds) {
            params.append("groupIds", groupId);
          }
        }
        return `displays?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendDisplay>(response, "getDisplays"),
      providesTags: createProvidesTags("Display"),
    }),
    getDisplaysBootstrap: build.query<
      DisplaysBootstrapResponse,
      DisplaysListQuery | void
    >({
      // Expensive aggregate; keep warm longer so navigation does not drop cache quickly.
      keepUnusedDataFor: 600,
      query: (query) => {
        const params = new URLSearchParams();
        params.set("page", String(query?.page ?? 1));
        params.set("pageSize", String(query?.pageSize ?? 20));
        if (query?.q) params.set("q", query.q);
        if (query?.status) params.set("status", query.status);
        if (query?.output) params.set("output", query.output);
        if (query?.sortBy) params.set("sortBy", query.sortBy);
        if (query?.sortDirection) {
          params.set("sortDirection", query.sortDirection);
        }
        if (query?.groupIds) {
          for (const groupId of query.groupIds) {
            params.append("groupIds", groupId);
          }
        }
        if (query?.groupNames) {
          for (const groupName of query.groupNames) {
            params.append("groupNames", groupName);
          }
        }
        return `displays/bootstrap?${params.toString()}`;
      },
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplaysBootstrapResponse>(
          response,
          "getDisplaysBootstrap",
        ),
      // Do not provide Content:LIST — content list invalidation should not refetch this bootstrap.
      providesTags: [
        { type: "Display", id: "LIST" },
        { type: "DisplayGroup", id: "LIST" },
        { type: "RuntimeOverrides", id: "GLOBAL" },
      ],
    }),
    getDisplayOptions: build.query<
      DisplayOption[],
      { q?: string; limit?: number } | void
    >({
      keepUnusedDataFor: 30,
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
    getDisplay: build.query<BackendDisplay, string>({
      query: (id) => `displays/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendDisplay>(response, "getDisplay"),
      providesTags: (_result, _error, id) => [{ type: "Display", id }],
    }),
    updateDisplay: build.mutation<BackendDisplay, UpdateDisplayRequest>({
      query: ({ id, ...body }) => ({
        url: `displays/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendDisplay>(response, "updateDisplay"),
      async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            displaysApi.util.updateQueryData("getDisplay", id, () => data),
          );
          const listArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplays",
          );
          for (const a of listArgs) {
            dispatch(
              displaysApi.util.updateQueryData("getDisplays", a, (draft) => {
                const d = draft as unknown as DisplaysListMutable;
                d.items = d.items.map((row) =>
                  row.id === id ? { ...row, ...data } : row,
                );
              }),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  b.displays.items = b.displays.items.map((row) =>
                    row.id === id ? { ...row, ...data } : row,
                  );
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    getRuntimeOverrides: build.query<DisplayRuntimeOverrides, void>({
      keepUnusedDataFor: 30,
      query: () => "displays/runtime-overrides",
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayRuntimeOverrides>(
          response,
          "getRuntimeOverrides",
        ),
      providesTags: [{ type: "RuntimeOverrides", id: "GLOBAL" }],
    }),
    activateGlobalEmergency: build.mutation<
      void,
      { slotIndex: number; reason?: string }
    >({
      query: ({ slotIndex, reason }) => ({
        url: "displays/runtime-overrides/emergency",
        method: "PUT",
        body: { active: true, slotIndex, ...(reason ? { reason } : {}) },
      }),
      async onQueryStarted(
        { slotIndex },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
          const startedAt = new Date().toISOString();
          dispatch(
            displaysApi.util.updateQueryData(
              "getRuntimeOverrides",
              undefined,
              (draft) => {
                const r = draft as unknown as {
                  globalEmergency: {
                    active: boolean;
                    startedAt: string | null;
                    activeSlotIndex: number | null;
                  };
                };
                r.globalEmergency.active = true;
                r.globalEmergency.startedAt = startedAt;
                r.globalEmergency.activeSlotIndex = slotIndex;
              },
            ),
          );
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  b.runtimeOverrides.globalEmergency.active = true;
                  b.runtimeOverrides.globalEmergency.startedAt = startedAt;
                  b.runtimeOverrides.globalEmergency.activeSlotIndex =
                    slotIndex;
                },
              ),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    deactivateGlobalEmergency: build.mutation<void, { reason?: string } | void>(
      {
        query: (body) => ({
          url: "displays/runtime-overrides/emergency",
          method: "PUT",
          body: { active: false, ...(body ?? {}) },
        }),
        async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
          try {
            await queryFulfilled;
            dispatch(
              displaysApi.util.updateQueryData(
                "getRuntimeOverrides",
                undefined,
                (draft) => {
                  const r = draft as unknown as {
                    globalEmergency: {
                      active: boolean;
                      startedAt: string | null;
                      activeSlotIndex: number | null;
                    };
                  };
                  r.globalEmergency.active = false;
                  r.globalEmergency.startedAt = null;
                  r.globalEmergency.activeSlotIndex = null;
                },
              ),
            );
            const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
              getState(),
              "getDisplaysBootstrap",
            );
            for (const a of bootstrapArgs) {
              dispatch(
                displaysApi.util.updateQueryData(
                  "getDisplaysBootstrap",
                  a,
                  (draft) => {
                    const b = draft as unknown as DisplaysBootstrapMutable;
                    b.runtimeOverrides.globalEmergency.active = false;
                    b.runtimeOverrides.globalEmergency.startedAt = null;
                    b.runtimeOverrides.globalEmergency.activeSlotIndex = null;
                  },
                ),
              );
            }
          } catch {
            // mutation failed
          }
        },
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
    createDisplayGroup: build.mutation<DisplayGroup, { name: string }>({
      query: (body) => ({
        url: "displays/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "createDisplayGroup"),
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: group } = await queryFulfilled;
          const groupArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroups",
          );
          for (const ga of groupArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroups",
                ga,
                (draft) => {
                  const groups = draft as unknown as DisplayGroup[];
                  groups.push({
                    ...group,
                    displayIds: [...group.displayIds],
                  });
                },
              ),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  b.displayGroups.push({
                    ...group,
                    displayIds: [...group.displayIds],
                  });
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    updateDisplayGroup: build.mutation<
      DisplayGroup,
      { groupId: string; name: string }
    >({
      query: ({ groupId, name }) => ({
        url: `displays/groups/${groupId}`,
        method: "PATCH",
        body: { name },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "updateDisplayGroup"),
      async onQueryStarted(
        { groupId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          const { data } = await queryFulfilled;
          const groupArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroups",
          );
          for (const ga of groupArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroups",
                ga,
                (draft) => {
                  const idx = draft.findIndex((g) => g.id === groupId);
                  if (idx !== -1) draft[idx] = data;
                },
              ),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  const idx = b.displayGroups.findIndex(
                    (g) => g.id === groupId,
                  );
                  if (idx !== -1) {
                    b.displayGroups[idx] = {
                      ...data,
                      displayIds: [...data.displayIds],
                    };
                  }
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    deleteDisplayGroup: build.mutation<void, { groupId: string }>({
      query: ({ groupId }) => ({
        url: `displays/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DisplayGroup", id: groupId },
      ],
      async onQueryStarted(
        { groupId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
          const groupArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroups",
          );
          for (const ga of groupArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroups",
                ga,
                (draft) => draft.filter((g) => g.id !== groupId),
              ),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  b.displayGroups = b.displayGroups.filter(
                    (g) => g.id !== groupId,
                  );
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
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
      async onQueryStarted(
        { displayId, groupIds },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
          const syncMembership = (
            groups: { id: string; displayIds: readonly string[] }[],
          ) => {
            for (const g of groups) {
              const gm = g as unknown as { displayIds: string[] };
              const shouldHave = groupIds.includes(g.id);
              const has = gm.displayIds.includes(displayId);
              if (shouldHave && !has) {
                gm.displayIds = [...gm.displayIds, displayId];
              } else if (!shouldHave && has) {
                gm.displayIds = gm.displayIds.filter(
                  (gid) => gid !== displayId,
                );
              }
            }
          };
          const groupArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroups",
          );
          for (const ga of groupArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroups",
                ga,
                (draft) => {
                  syncMembership(draft);
                },
              ),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  syncMembership(b.displayGroups);
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    unregisterDisplay: build.mutation<void, { displayId: string }>({
      query: ({ displayId }) => ({
        url: `displays/${displayId}/unregister`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: displayId },
      ],
      async onQueryStarted(
        { displayId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
          const listArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplays",
          );
          for (const a of listArgs) {
            dispatch(
              displaysApi.util.updateQueryData("getDisplays", a, (draft) => {
                patchPaginatedListById(draft, "remove", {
                  id: displayId,
                } as BackendDisplay);
              }),
            );
          }
          const bootstrapArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplaysBootstrap",
          );
          for (const a of bootstrapArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysBootstrap",
                a,
                (draft) => {
                  const b = draft as unknown as DisplaysBootstrapMutable;
                  patchPaginatedListById(b.displays, "remove", {
                    id: displayId,
                  } as BackendDisplay);
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    closeRegistrationAttempt: build.mutation<void, { attemptId: string }>({
      query: ({ attemptId }) => ({
        url: `displays/registration-attempts/${attemptId}`,
        method: "DELETE",
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    createRegistrationLink: build.mutation<
      CreateRegistrationLinkResponse,
      CreateRegistrationLinkRequest
    >({
      query: (body) => ({
        url: "displays/registration-links",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<CreateRegistrationLinkResponse>(
          response,
          "createRegistrationLink",
        ),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpDisplaysNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useGetDisplaysQuery,
  useLazyGetDisplaysQuery,
  useGetDisplaysBootstrapQuery,
  useLazyGetDisplaysBootstrapQuery,
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
  useCreateRegistrationLinkMutation,
} = displaysApi;
