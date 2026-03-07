import { createApi } from "@reduxjs/toolkit/query/react";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";

export interface BackendPlaylist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: "DRAFT" | "IN_USE";
  readonly itemsCount: number;
  readonly totalDuration: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: {
    readonly id: string;
    readonly name: string | null;
  };
}

export interface BackendPlaylistItem {
  readonly id: string;
  readonly sequence: number;
  readonly duration: number;
  readonly content: {
    readonly id: string;
    readonly title: string;
    readonly type: "IMAGE" | "VIDEO" | "PDF";
    readonly checksum: string;
  };
}

export interface BackendPlaylistWithItems extends BackendPlaylist {
  readonly items: readonly BackendPlaylistItem[];
}

export interface BackendPlaylistListResponse {
  readonly items: readonly BackendPlaylist[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface PlaylistListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: "DRAFT" | "IN_USE";
  readonly search?: string;
  readonly sortBy?: "updatedAt" | "name";
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
}

export interface UpdatePlaylistItemRequest {
  readonly playlistId: string;
  readonly itemId: string;
  readonly sequence?: number;
  readonly duration?: number;
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
      }
    | {
        kind: "new";
        contentId: string;
        duration: number;
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

export const playlistsApi = createApi({
  reducerPath: "playlistsApi",
  baseQuery,
  tagTypes: ["Playlist"],
  endpoints: (build) => ({
    listPlaylists: build.query<
      BackendPlaylistListResponse,
      PlaylistListQuery | void
    >({
      query: (params) => ({
        url: "playlists",
        params: params ?? {},
      }),
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<BackendPlaylist>(
          response,
          "listPlaylists",
        );
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.pageSize,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Playlist" as const,
                id,
              })),
              { type: "Playlist", id: "LIST" },
            ]
          : [{ type: "Playlist", id: "LIST" }],
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
    createPlaylist: build.mutation<BackendPlaylist, CreatePlaylistRequest>({
      query: (body) => ({
        url: "playlists",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylist>(response, "createPlaylist"),
      invalidatesTags: [{ type: "Playlist", id: "LIST" }],
    }),
    updatePlaylist: build.mutation<BackendPlaylist, UpdatePlaylistRequest>({
      query: ({ id, ...body }) => ({
        url: `playlists/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylist>(response, "updatePlaylist"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Playlist", id: "LIST" },
        { type: "Playlist", id },
      ],
    }),
    deletePlaylist: build.mutation<void, string>({
      query: (id) => ({
        url: `playlists/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Playlist", id: "LIST" },
        { type: "Playlist", id },
      ],
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
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: "Playlist", id: playlistId },
        { type: "Playlist", id: "LIST" },
      ],
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
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: "Playlist", id: playlistId },
        { type: "Playlist", id: "LIST" },
      ],
    }),
    deletePlaylistItem: build.mutation<void, DeletePlaylistItemRequest>({
      query: ({ playlistId, itemId }) => ({
        url: `playlists/${playlistId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: "Playlist", id: playlistId },
        { type: "Playlist", id: "LIST" },
      ],
    }),
    reorderPlaylistItems: build.mutation<void, ReorderPlaylistItemsRequest>({
      query: ({ playlistId, orderedItemIds }) => ({
        url: `playlists/${playlistId}/items/reorder`,
        method: "PUT",
        body: { orderedItemIds },
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: "Playlist", id: playlistId },
        { type: "Playlist", id: "LIST" },
      ],
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
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: "Playlist", id: playlistId },
        { type: "Playlist", id: "LIST" },
      ],
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
