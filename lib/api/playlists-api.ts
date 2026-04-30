import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";

export interface BackendPlaylistBase {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: "DRAFT" | "IN_USE";
  readonly itemsCount: number;
  readonly totalDuration: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: {
    readonly id: string;
    readonly name: string | null;
  };
}

export interface BackendPlaylistItem {
  readonly id: string;
  readonly sequence: number;
  readonly duration: number;
  readonly loop: boolean;
  readonly content: {
    readonly id: string;
    readonly title: string;
    readonly type: "IMAGE" | "VIDEO" | "TEXT";
    readonly checksum: string;
    readonly thumbnailUrl?: string | null;
    readonly textHtmlContent?: string | null;
  };
}

export interface BackendPlaylistSummary extends BackendPlaylistBase {
  readonly previewItems: readonly BackendPlaylistItem[];
}

export interface BackendPlaylistWithItems extends BackendPlaylistBase {
  readonly items: readonly BackendPlaylistItem[];
}

export interface BackendPlaylistListResponse {
  readonly items: readonly BackendPlaylistSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface PlaylistOption {
  readonly id: string;
  readonly name: string;
}

export interface PlaylistListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: "DRAFT" | "IN_USE";
  readonly search?: string;
  readonly sortBy?: "createdAt" | "updatedAt" | "name";
  readonly sortDirection?: "asc" | "desc";
}

export interface CreatePlaylistRequest {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdatePlaylistRequest {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
}

export interface AddPlaylistItemRequest {
  readonly playlistId: string;
  readonly contentId: string;
  readonly sequence: number;
  readonly duration: number;
  readonly loop?: boolean;
}

export interface UpdatePlaylistItemRequest {
  readonly playlistId: string;
  readonly itemId: string;
  readonly sequence?: number;
  readonly duration?: number;
  readonly loop?: boolean;
}

export interface DeletePlaylistItemRequest {
  readonly playlistId: string;
  readonly itemId: string;
}

export interface ReorderPlaylistItemsRequest {
  readonly playlistId: string;
  readonly orderedItemIds: readonly string[];
}

export interface SavePlaylistItemsAtomicRequest {
  readonly playlistId: string;
  readonly items: readonly (
    | {
        kind: "existing";
        itemId: string;
        duration: number;
        loop?: boolean;
      }
    | {
        kind: "new";
        contentId: string;
        duration: number;
        loop?: boolean;
      }
  )[];
}

export interface EstimatePlaylistDurationRequest {
  readonly displayId: string;
  readonly items: readonly {
    contentId: string;
    duration: number;
    sequence: number;
  }[];
}

export interface PlaylistDurationEstimate {
  readonly baseDurationSeconds: number;
  readonly scrollExtraSeconds: number;
  readonly effectiveDurationSeconds: number;
  readonly items: readonly {
    contentId: string;
    baseDurationSeconds: number;
    scrollExtraSeconds: number;
    effectiveDurationSeconds: number;
  }[];
}

/** RTK/Immer drafts still mirror readonly API types; cast for safe local mutation */
type PlaylistDetailMutable = {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "IN_USE";
  itemsCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string | null };
  items: BackendPlaylistItem[];
};

type PlaylistListMutable = Omit<BackendPlaylistListResponse, "items"> & {
  items: BackendPlaylistSummary[];
};

export const playlistsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPlaylistOptions: build.query<
      PlaylistOption[],
      { q?: string; status?: "DRAFT" | "IN_USE" } | void
    >({
      query: (params) => ({
        url: "playlists/options",
        params: {
          q: params?.q,
          status: params?.status,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<PlaylistOption[]>(
          response,
          "getPlaylistOptions",
        ),
      providesTags: [{ type: "Playlist", id: "LIST" }],
    }),
    listPlaylists: build.query<
      BackendPlaylistListResponse,
      PlaylistListQuery | void
    >({
      query: (params) => ({
        url: "playlists",
        params: params ?? {},
      }),
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendPlaylistSummary>(
          response,
          "listPlaylists",
        ),
      providesTags: createProvidesTags("Playlist"),
    }),
    getPlaylist: build.query<BackendPlaylistWithItems, string>({
      query: (id) => `playlists/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistWithItems>(
          response,
          "getPlaylist",
        ),
      providesTags: (_result, _error, id) => [{ type: "Playlist", id }],
    }),
    createPlaylist: build.mutation<BackendPlaylistBase, CreatePlaylistRequest>({
      query: (body) => ({
        url: "playlists",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistBase>(
          response,
          "createPlaylist",
        ),
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: created } = await queryFulfilled;
          const summary: BackendPlaylistSummary = {
            ...created,
            previewItems: [],
          };
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                patchPaginatedListById(draft, "add", summary, {
                  position: "start",
                });
              }),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    updatePlaylist: build.mutation<BackendPlaylistBase, UpdatePlaylistRequest>({
      query: ({ id, ...body }) => ({
        url: `playlists/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistBase>(
          response,
          "updatePlaylist",
        ),
      async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                const d = draft as unknown as PlaylistListMutable;
                const idx = d.items.findIndex((p) => p.id === id);
                if (idx === -1) return;
                d.items = d.items.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        name: data.name,
                        description: data.description,
                        status: data.status,
                        itemsCount: data.itemsCount,
                        totalDuration: data.totalDuration,
                        updatedAt: data.updatedAt,
                        owner: data.owner,
                      }
                    : p,
                );
              }),
            );
          }
          dispatch(
            playlistsApi.util.updateQueryData("getPlaylist", id, (draft) => {
              const d = draft as unknown as PlaylistDetailMutable;
              Object.assign(d, {
                name: data.name,
                description: data.description,
                status: data.status,
                itemsCount: data.itemsCount,
                totalDuration: data.totalDuration,
                updatedAt: data.updatedAt,
                owner: data.owner,
              });
            }),
          );
        } catch {
          // mutation failed
        }
      },
    }),
    deletePlaylist: build.mutation<void, string>({
      query: (id) => ({
        url: `playlists/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [{ type: "Playlist", id }],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                patchPaginatedListById(
                  draft,
                  "remove",
                  { id } as BackendPlaylistSummary,
                );
              }),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    addPlaylistItem: build.mutation<
      BackendPlaylistItem,
      AddPlaylistItemRequest
    >({
      query: ({ playlistId, ...body }) => ({
        url: `playlists/${playlistId}/items`,
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistItem>(
          response,
          "addPlaylistItem",
        ),
      async onQueryStarted(
        { playlistId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          const { data: item } = await queryFulfilled;
          dispatch(
            playlistsApi.util.updateQueryData(
              "getPlaylist",
              playlistId,
              (draft) => {
                const d = draft as unknown as PlaylistDetailMutable;
                const next = [...d.items, item].sort(
                  (a, b) => a.sequence - b.sequence,
                );
                d.items = next;
                d.itemsCount += 1;
                d.totalDuration += item.duration;
              },
            ),
          );
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                const d = draft as unknown as PlaylistListMutable;
                const idx = d.items.findIndex((p) => p.id === playlistId);
                if (idx === -1) return;
                d.items = d.items.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        itemsCount: p.itemsCount + 1,
                        totalDuration: p.totalDuration + item.duration,
                      }
                    : p,
                );
              }),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    updatePlaylistItem: build.mutation<
      BackendPlaylistItem,
      UpdatePlaylistItemRequest
    >({
      query: ({ playlistId, itemId, ...body }) => ({
        url: `playlists/${playlistId}/items/${itemId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistItem>(
          response,
          "updatePlaylistItem",
        ),
      async onQueryStarted(
        { playlistId, itemId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          const { data: updated } = await queryFulfilled;
          let deltaDuration = 0;
          dispatch(
            playlistsApi.util.updateQueryData(
              "getPlaylist",
              playlistId,
              (draft) => {
                const d = draft as unknown as PlaylistDetailMutable;
                const idx = d.items.findIndex((i) => i.id === itemId);
                if (idx === -1) return;
                const prev = d.items[idx].duration;
                deltaDuration = updated.duration - prev;
                const next = [...d.items];
                next[idx] = updated;
                d.items = next.sort((a, b) => a.sequence - b.sequence);
                d.totalDuration += deltaDuration;
              },
            ),
          );
          if (deltaDuration !== 0) {
            const listArgs = playlistsApi.util.selectCachedArgsForQuery(
              getState(),
              "listPlaylists",
            );
            for (const la of listArgs) {
              dispatch(
                playlistsApi.util.updateQueryData(
                  "listPlaylists",
                  la,
                  (draft) => {
                    const d = draft as unknown as PlaylistListMutable;
                    const idx = d.items.findIndex((p) => p.id === playlistId);
                    if (idx === -1) return;
                    d.items = d.items.map((p, i) =>
                      i === idx
                        ? {
                            ...p,
                            totalDuration: p.totalDuration + deltaDuration,
                          }
                        : p,
                    );
                  },
                ),
              );
            }
          }
        } catch {
          // mutation failed
        }
      },
    }),
    deletePlaylistItem: build.mutation<void, DeletePlaylistItemRequest>({
      query: ({ playlistId, itemId }) => ({
        url: `playlists/${playlistId}/items/${itemId}`,
        method: "DELETE",
      }),
      async onQueryStarted(
        { playlistId, itemId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
          let duration = 0;
          dispatch(
            playlistsApi.util.updateQueryData(
              "getPlaylist",
              playlistId,
              (draft) => {
                const d = draft as unknown as PlaylistDetailMutable;
                const item = d.items.find((i) => i.id === itemId);
                if (item) duration = item.duration;
                d.items = d.items.filter((i) => i.id !== itemId);
                d.itemsCount = Math.max(0, d.itemsCount - 1);
                d.totalDuration = Math.max(0, d.totalDuration - duration);
              },
            ),
          );
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                const d = draft as unknown as PlaylistListMutable;
                const idx = d.items.findIndex((p) => p.id === playlistId);
                if (idx === -1) return;
                d.items = d.items.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        itemsCount: Math.max(0, p.itemsCount - 1),
                        totalDuration: Math.max(0, p.totalDuration - duration),
                      }
                    : p,
                );
              }),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    reorderPlaylistItems: build.mutation<void, ReorderPlaylistItemsRequest>({
      query: ({ playlistId, orderedItemIds }) => ({
        url: `playlists/${playlistId}/items/reorder`,
        method: "PUT",
        body: { orderedItemIds },
      }),
      async onQueryStarted(
        { playlistId, orderedItemIds },
        { dispatch, queryFulfilled },
      ) {
        try {
          await queryFulfilled;
          dispatch(
            playlistsApi.util.updateQueryData(
              "getPlaylist",
              playlistId,
              (draft) => {
                const d = draft as unknown as PlaylistDetailMutable;
                const byId = new Map(d.items.map((i) => [i.id, i]));
                d.items = orderedItemIds
                  .map((oid) => byId.get(oid))
                  .filter((x): x is BackendPlaylistItem => x != null);
              },
            ),
          );
        } catch {
          // mutation failed
        }
      },
    }),
    savePlaylistItemsAtomic: build.mutation<
      readonly BackendPlaylistItem[],
      SavePlaylistItemsAtomicRequest
    >({
      query: ({ playlistId, items }) => ({
        url: `playlists/${playlistId}/items`,
        method: "PUT",
        body: { items },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<readonly BackendPlaylistItem[]>(
          response,
          "savePlaylistItemsAtomic",
        ),
      async onQueryStarted(
        { playlistId },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          const { data: items } = await queryFulfilled;
          const totalDuration = items.reduce((s, i) => s + i.duration, 0);
          dispatch(
            playlistsApi.util.updateQueryData(
              "getPlaylist",
              playlistId,
              (draft) => {
                const d = draft as unknown as PlaylistDetailMutable;
                d.items = [...items];
                d.itemsCount = items.length;
                d.totalDuration = totalDuration;
              },
            ),
          );
          const listArgs = playlistsApi.util.selectCachedArgsForQuery(
            getState(),
            "listPlaylists",
          );
          for (const la of listArgs) {
            dispatch(
              playlistsApi.util.updateQueryData("listPlaylists", la, (draft) => {
                const d = draft as unknown as PlaylistListMutable;
                const idx = d.items.findIndex((p) => p.id === playlistId);
                if (idx === -1) return;
                d.items = d.items.map((p, i) =>
                  i === idx
                    ? {
                        ...p,
                        itemsCount: items.length,
                        totalDuration,
                      }
                    : p,
                );
              }),
            );
          }
        } catch {
          // mutation failed
        }
      },
    }),
    estimatePlaylistDuration: build.mutation<
      PlaylistDurationEstimate,
      EstimatePlaylistDurationRequest
    >({
      query: (body) => ({
        url: "playlists/duration-estimate",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<PlaylistDurationEstimate>(
          response,
          "estimatePlaylistDuration",
        ),
    }),
  }),
});

export const {
  useGetPlaylistOptionsQuery,
  useListPlaylistsQuery,
  useGetPlaylistQuery,
  useLazyGetPlaylistQuery,
  useCreatePlaylistMutation,
  useUpdatePlaylistMutation,
  useDeletePlaylistMutation,
  useAddPlaylistItemMutation,
  useUpdatePlaylistItemMutation,
  useDeletePlaylistItemMutation,
  useReorderPlaylistItemsMutation,
  useSavePlaylistItemsAtomicMutation,
  useEstimatePlaylistDurationMutation,
} = playlistsApi;
