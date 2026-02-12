import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const SESSION_KEY = "wildfire_session";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (typeof url !== "string" || url === "") {
    return "";
  }
  return url.replace(/\/$/, "");
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { token?: string };
    return typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders(headers) {
    const token = getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

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
