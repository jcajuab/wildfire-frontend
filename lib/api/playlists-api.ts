import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";

export interface BackendPlaylist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
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

export const playlistsApi = createApi({
  reducerPath: "playlistsApi",
  baseQuery,
  tagTypes: ["Playlist"],
  endpoints: (build) => ({
    listPlaylists: build.query<BackendPlaylistListResponse, void>({
      query: () => "playlists",
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
      providesTags: (_result, _error, id) => [{ type: "Playlist", id }],
    }),
    createPlaylist: build.mutation<BackendPlaylist, CreatePlaylistRequest>({
      query: (body) => ({
        url: "playlists",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Playlist", id: "LIST" }],
    }),
    updatePlaylist: build.mutation<BackendPlaylist, UpdatePlaylistRequest>({
      query: ({ id, ...body }) => ({
        url: `playlists/${id}`,
        method: "PATCH",
        body,
      }),
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
} = playlistsApi;
