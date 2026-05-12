import {
  revalidateWildfireTagsViaRoute,
  revalidateWildfireTagViaRoute,
} from "@/lib/api/revalidate-via-route";
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
  readonly excludeGroupIds?: readonly string[];
  readonly groupNames?: readonly string[];
  readonly output?: string;
  readonly sortBy?: "name" | "status" | "groupCount";
  readonly sortDirection?: "asc" | "desc";
  readonly membership?: "ungrouped" | "any";
}

export interface DisplayGroupsListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly q?: string;
  readonly displayId?: string;
  readonly membership?: "member" | "non-member";
  readonly sortBy?: "name" | "count";
  readonly sortDirection?: "asc" | "desc";
}

export interface DisplayGroupsListResponse {
  readonly items: readonly DisplayGroup[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ResolveDisplayGroupsRequest {
  readonly names: readonly string[];
}

export interface ResolveDisplayGroupsResponse {
  readonly items: readonly { readonly id: string; readonly name: string }[];
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
        if (query?.membership) params.set("membership", query.membership);
        if (query?.groupIds) {
          for (const groupId of query.groupIds) {
            params.append("groupIds", groupId);
          }
        }
        if (query?.excludeGroupIds) {
          for (const groupId of query.excludeGroupIds) {
            params.append("excludeGroupIds", groupId);
          }
        }
        return `displays?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendDisplay>(response, "getDisplays"),
      providesTags: createProvidesTags("Display"),
    }),
    getDisplaysInfinite: build.infiniteQuery<
      DisplaysListResponse,
      Omit<DisplaysListQuery, "page">,
      number
    >({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (last, _all, lastParam) =>
          last.items.length < last.pageSize ? undefined : lastParam + 1,
      },
      query: ({ queryArg, pageParam }) => {
        const params = new URLSearchParams();
        params.set("page", String(pageParam));
        params.set("pageSize", String(queryArg.pageSize ?? 20));
        if (queryArg.q) params.set("q", queryArg.q);
        if (queryArg.status) params.set("status", queryArg.status);
        if (queryArg.output) params.set("output", queryArg.output);
        if (queryArg.sortBy) params.set("sortBy", queryArg.sortBy);
        if (queryArg.sortDirection)
          params.set("sortDirection", queryArg.sortDirection);
        if (queryArg.membership) params.set("membership", queryArg.membership);
        if (queryArg.groupIds) {
          for (const groupId of queryArg.groupIds) {
            params.append("groupIds", groupId);
          }
        }
        if (queryArg.excludeGroupIds) {
          for (const groupId of queryArg.excludeGroupIds) {
            params.append("excludeGroupIds", groupId);
          }
        }
        return `displays?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendDisplay>(
          response,
          "getDisplaysInfinite",
        ),
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((p) =>
                p.items.map(({ id }) => ({
                  type: "Display" as const,
                  id,
                })),
              ),
              { type: "Display", id: "LIST" },
            ]
          : [{ type: "Display", id: "LIST" }],
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Display" as const, id })),
              { type: "Display", id: "LIST" },
            ]
          : [{ type: "Display", id: "LIST" }],
    }),
    getDisplayOutputOptions: build.query<DisplayOutputOption[], void>({
      query: () => "displays/options/outputs",
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayOutputOption[]>(
          response,
          "getDisplayOutputOptions",
        ),
      providesTags: [{ type: "Display", id: "LIST" }],
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
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Display", id },
        { type: "Display", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
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
          // Eager cross-cache patching: Display → Schedules (Pattern B)
          const { schedulesApi } = await import("@/lib/api/schedules-api");
          const scheduleBootstrapArgs =
            schedulesApi.util.selectCachedArgsForQuery(
              getState(),
              "getSchedulesBootstrap",
            );
          for (const sa of scheduleBootstrapArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "getSchedulesBootstrap",
                sa,
                (draft) => {
                  for (const opt of draft.displayOptions as {
                    id: string;
                    name: string;
                  }[]) {
                    if (opt.id === id) {
                      opt.name = data.name ?? opt.name;
                    }
                  }
                  for (const schedule of draft.schedules as {
                    display: { id: string; name: string | null };
                  }[]) {
                    if (schedule.display.id === id) {
                      schedule.display.name = data.name ?? null;
                    }
                  }
                },
              ),
            );
          }

          await bumpDisplaysNextCache();
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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
      invalidatesTags: [
        { type: "RuntimeOverrides", id: "GLOBAL" },
        { type: "Display", id: "LIST" },
      ],
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
          await bumpDisplaysNextCache();
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
        invalidatesTags: [
          { type: "RuntimeOverrides", id: "GLOBAL" },
          { type: "Display", id: "LIST" },
        ],
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
            await bumpDisplaysNextCache();
          } catch {
            // mutation failed
          }
        },
      },
    ),
    getDisplayGroups: build.query<
      DisplayGroupsListResponse,
      DisplayGroupsListQuery | void
    >({
      query: (query) => {
        const params = new URLSearchParams();
        params.set("page", String(query?.page ?? 1));
        params.set("pageSize", String(query?.pageSize ?? 20));
        if (query?.q) params.set("q", query.q);
        if (query?.displayId) params.set("displayId", query.displayId);
        if (query?.membership) params.set("membership", query.membership);
        if (query?.sortBy) params.set("sortBy", query.sortBy);
        if (query?.sortDirection)
          params.set("sortDirection", query.sortDirection);
        return `displays/groups?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<DisplayGroup>(
          response,
          "getDisplayGroups",
        ),
      providesTags: createProvidesTags("DisplayGroup"),
    }),
    getDisplayGroupsInfinite: build.infiniteQuery<
      DisplayGroupsListResponse,
      Omit<DisplayGroupsListQuery, "page">,
      number
    >({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (last, _all, lastParam) =>
          last.items.length < last.pageSize ? undefined : lastParam + 1,
      },
      query: ({ queryArg, pageParam }) => {
        const params = new URLSearchParams();
        params.set("page", String(pageParam));
        params.set("pageSize", String(queryArg.pageSize ?? 20));
        if (queryArg.q) params.set("q", queryArg.q);
        if (queryArg.displayId) params.set("displayId", queryArg.displayId);
        if (queryArg.membership) params.set("membership", queryArg.membership);
        if (queryArg.sortBy) params.set("sortBy", queryArg.sortBy);
        if (queryArg.sortDirection)
          params.set("sortDirection", queryArg.sortDirection);
        return `displays/groups?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<DisplayGroup>(
          response,
          "getDisplayGroupsInfinite",
        ),
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((p) =>
                p.items.map(({ id }) => ({
                  type: "DisplayGroup" as const,
                  id,
                })),
              ),
              { type: "DisplayGroup", id: "LIST" },
            ]
          : [{ type: "DisplayGroup", id: "LIST" }],
    }),
    getDisplayGroupsForDisplay: build.query<
      DisplayGroupsListResponse,
      {
        readonly displayId: string;
        readonly page?: number;
        readonly pageSize?: number;
        readonly q?: string;
        readonly membership?: "member" | "non-member";
      }
    >({
      query: ({ displayId, page, pageSize, q, membership }) => {
        const params = new URLSearchParams();
        params.set("page", String(page ?? 1));
        params.set("pageSize", String(pageSize ?? 20));
        params.set("displayId", displayId);
        if (q) params.set("q", q);
        if (membership) params.set("membership", membership);
        return `displays/groups?${params.toString()}`;
      },
      transformResponse: (response) =>
        transformPaginatedListResponse<DisplayGroup>(
          response,
          "getDisplayGroupsForDisplay",
        ),
      providesTags: createProvidesTags("DisplayGroup"),
    }),
    resolveDisplayGroups: build.mutation<
      ResolveDisplayGroupsResponse,
      ResolveDisplayGroupsRequest
    >({
      query: (body) => ({
        url: "displays/groups/resolve",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<ResolveDisplayGroupsResponse>(
          response,
          "resolveDisplayGroups",
        ),
      invalidatesTags: [
        { type: "DisplayGroup", id: "LIST" },
        { type: "Display", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await revalidateWildfireTagsViaRoute([
            "displays-bootstrap",
            "displays-options",
            "schedules-bootstrap",
          ]);
        } catch {
          // mutation failed
        }
      },
    }),
    createDisplayGroup: build.mutation<DisplayGroup, { name: string }>({
      query: (body) => ({
        url: "displays/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "createDisplayGroup"),
      invalidatesTags: [
        { type: "DisplayGroup", id: "LIST" },
        { type: "Display", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: group } = await queryFulfilled;
          // Keep bootstrap.displayGroups consistent for legacy consumers
          // (use-displays-page, use-schedules-page) that still read it.
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
                  if (!b.displayGroups.some((g) => g.id === group.id)) {
                    b.displayGroups.push({
                      ...group,
                      displayIds: [...group.displayIds],
                    });
                  }
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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
      invalidatesTags: [
        { type: "DisplayGroup", id: "LIST" },
        { type: "Display", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
      async onQueryStarted(
        { groupId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          const { data } = await queryFulfilled;
          // Patch paginated getDisplayGroups caches.
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
                  const items = draft.items as DisplayGroup[];
                  const idx = items.findIndex((g) => g.id === groupId);
                  if (idx !== -1) {
                    items[idx] = {
                      ...data,
                      displayIds: [...data.displayIds],
                    };
                  }
                },
              ),
            );
          }
          // Patch infinite getDisplayGroupsInfinite caches.
          const infiniteArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroupsInfinite",
          );
          for (const ia of infiniteArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroupsInfinite",
                ia,
                (draft) => {
                  for (const page of draft.pages) {
                    const items = page.items as DisplayGroup[];
                    const idx = items.findIndex((g) => g.id === groupId);
                    if (idx !== -1) {
                      items[idx] = {
                        ...data,
                        displayIds: [...data.displayIds],
                      };
                    }
                  }
                },
              ),
            );
          }
          // Patch getDisplayGroupsForDisplay caches.
          const perDisplayArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroupsForDisplay",
          );
          for (const pa of perDisplayArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroupsForDisplay",
                pa,
                (draft) => {
                  const items = draft.items as DisplayGroup[];
                  const idx = items.findIndex((g) => g.id === groupId);
                  if (idx !== -1) {
                    items[idx] = {
                      ...data,
                      displayIds: [...data.displayIds],
                    };
                  }
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
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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
        { type: "DisplayGroup", id: "LIST" },
        { type: "Display", id: "LIST" },
        { type: "Schedule", id: "LIST" },
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
                (draft) => {
                  const d = draft as unknown as {
                    items: DisplayGroup[];
                    total: number;
                  };
                  const idx = d.items.findIndex((g) => g.id === groupId);
                  if (idx !== -1) {
                    d.items.splice(idx, 1);
                    d.total = Math.max(0, d.total - 1);
                  }
                },
              ),
            );
          }
          const infiniteArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroupsInfinite",
          );
          for (const ia of infiniteArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroupsInfinite",
                ia,
                (draft) => {
                  for (const page of draft.pages) {
                    const p = page as unknown as {
                      items: DisplayGroup[];
                      total: number;
                    };
                    const idx = p.items.findIndex((g) => g.id === groupId);
                    if (idx !== -1) {
                      p.items.splice(idx, 1);
                      p.total = Math.max(0, p.total - 1);
                    }
                  }
                },
              ),
            );
          }
          const perDisplayArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroupsForDisplay",
          );
          for (const pa of perDisplayArgs) {
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroupsForDisplay",
                pa,
                (draft) => {
                  const d = draft as unknown as {
                    items: DisplayGroup[];
                    total: number;
                  };
                  const idx = d.items.findIndex((g) => g.id === groupId);
                  if (idx !== -1) {
                    d.items.splice(idx, 1);
                    d.total = Math.max(0, d.total - 1);
                  }
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
                  b.displayGroups = b.displayGroups.filter(
                    (g) => g.id !== groupId,
                  );
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: displayId },
        { type: "Display", id: "LIST" },
        { type: "DisplayGroup", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
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
                  syncMembership(draft.items as DisplayGroup[]);
                },
              ),
            );
          }
          // For getDisplayGroupsForDisplay: when membership changes for the
          // affected displayId, the result set itself shifts (member ↔
          // non-member), so the synchronous syncMembership patch isn't enough.
          // Patch OTHER displays' caches (only their nested displayIds need to
          // change), and force-refetch caches whose displayId matches the
          // mutated display.
          const perDisplayArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplayGroupsForDisplay",
          );
          let needsAffectedDisplayRefetch = false;
          for (const pa of perDisplayArgs) {
            if (pa.displayId === displayId) {
              needsAffectedDisplayRefetch = true;
              continue;
            }
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplayGroupsForDisplay",
                pa,
                (draft) => {
                  syncMembership(draft.items as DisplayGroup[]);
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
          // Patch any active getDisplays caches whose groupIds filter no longer
          // matches the display's new membership.
          const displaysArgs = displaysApi.util.selectCachedArgsForQuery(
            getState(),
            "getDisplays",
          );
          for (const a of displaysArgs) {
            const filterGroupIds = a?.groupIds ?? [];
            if (filterGroupIds.length === 0) continue;
            const matchesAfter = filterGroupIds.some((gid) =>
              groupIds.includes(gid),
            );
            if (matchesAfter) continue;
            dispatch(
              displaysApi.util.updateQueryData("getDisplays", a, (draft) => {
                if (draft.items.some((d) => d.id === displayId)) {
                  patchPaginatedListById(draft, "remove", {
                    id: displayId,
                  } as BackendDisplay);
                }
              }),
            );
          }
          // Also patch infinite displays caches whose membership filter no
          // longer matches.
          const displaysInfiniteArgs =
            displaysApi.util.selectCachedArgsForQuery(
              getState(),
              "getDisplaysInfinite",
            );
          for (const a of displaysInfiniteArgs) {
            const filterGroupIds = a?.groupIds ?? [];
            if (filterGroupIds.length === 0) continue;
            const matchesAfter = filterGroupIds.some((gid) =>
              groupIds.includes(gid),
            );
            if (matchesAfter) continue;
            dispatch(
              displaysApi.util.updateQueryData(
                "getDisplaysInfinite",
                a,
                (draft) => {
                  for (const page of draft.pages) {
                    if (page.items.some((d) => d.id === displayId)) {
                      patchPaginatedListById(page, "remove", {
                        id: displayId,
                      } as BackendDisplay);
                    }
                  }
                },
              ),
            );
          }
          await bumpDisplaysNextCache();
          if (needsAffectedDisplayRefetch) {
            dispatch(
              displaysApi.util.invalidateTags([
                { type: "DisplayGroup", id: "LIST" },
              ]),
            );
          }
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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
        { type: "Display", id: "LIST" },
        { type: "DisplayGroup", id: "LIST" },
        { type: "Schedule", id: "LIST" },
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
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          void revalidateWildfireTagViaRoute("schedules-bootstrap");
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

// Infinite-query hooks: TS struggles to surface the auto-generated
// `useGetXInfiniteQuery` names on the top-level api object (shows up as
// `Property does not exist`), so we re-export them directly off the endpoint
// objects, where the type is fully resolved.
export const useGetDisplaysInfiniteQuery =
  displaysApi.endpoints.getDisplaysInfinite.useInfiniteQuery;
export const useGetDisplayGroupsInfiniteQuery =
  displaysApi.endpoints.getDisplayGroupsInfinite.useInfiniteQuery;

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
  useGetDisplayGroupsForDisplayQuery,
  useResolveDisplayGroupsMutation,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  useDeleteDisplayGroupMutation,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useCreateRegistrationLinkMutation,
} = displaysApi;
