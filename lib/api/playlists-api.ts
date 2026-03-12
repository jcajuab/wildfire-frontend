import { createApi } from "@reduxjs/toolkit/query/react";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
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
  readonly content: {
    readonly id: string;
    readonly title: string;
    readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT";
    readonly checksum: string;
    readonly thumbnailUrl?: string | null;
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
        parseApiResponseDataSafe<BackendPlaylistBase>(response, "createPlaylist"),
      invalidatesTags: [{ type: "Playlist", id: "LIST" }],
    }),
    updatePlaylist: build.mutation<BackendPlaylistBase, UpdatePlaylistRequest>({
      query: ({ id, ...body }) => ({
        url: `playlists/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendPlaylistBase>(response, "updatePlaylist"),
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
