import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://example.test";
});

vi.mock("@/app/actions/revalidate-wildfire-cache", () => ({
  revalidateWildfireTag: vi.fn(async () => undefined),
}));

import { revalidateWildfireTag } from "@/app/actions/revalidate-wildfire-cache";
import { bootstrapAccessToken, clearAuthSession } from "@/lib/auth-session";
import type { AppStore } from "@/lib/store";
import {
  type BackendPlaylistBase,
  type BackendPlaylistItem,
  type BackendPlaylistListResponse,
  type BackendPlaylistSummary,
  playlistsApi,
  type PlaylistListQuery,
} from "./playlists-api";

const originalFetch = global.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

const defaultQuery: PlaylistListQuery = {
  page: 1,
  pageSize: 12,
  sortBy: "createdAt",
  sortDirection: "desc",
};

const owner = {
  id: "user-1",
  name: "Owner",
};

function makeStore(): AppStore {
  return configureStore({
    reducer: {
      [playlistsApi.reducerPath]: playlistsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(playlistsApi.middleware),
  });
}

function playlistBase(
  overrides: Partial<BackendPlaylistBase> = {},
): BackendPlaylistBase {
  return {
    id: "playlist-1",
    name: "Morning Playlist",
    description: null,
    status: "DRAFT",
    itemsCount: 0,
    totalDuration: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    owner,
    ...overrides,
  };
}

function playlistSummary(
  overrides: Partial<BackendPlaylistSummary> = {},
): BackendPlaylistSummary {
  return {
    ...playlistBase(overrides),
    previewItems: [],
    ...overrides,
  };
}

function playlistItem(
  overrides: Partial<BackendPlaylistItem> = {},
): BackendPlaylistItem {
  return {
    id: "item-1",
    sequence: 10,
    duration: 10,
    loop: false,
    content: {
      id: "content-1",
      title: "Poster",
      type: "IMAGE",
      checksum: "checksum-1",
      thumbnailUrl: null,
      textHtmlContent: null,
    },
    ...overrides,
  };
}

function listResponse(
  items: readonly BackendPlaylistSummary[],
  overrides: Partial<BackendPlaylistListResponse> = {},
): BackendPlaylistListResponse {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}

function selectList(
  store: AppStore,
  query: PlaylistListQuery,
): BackendPlaylistListResponse | undefined {
  return playlistsApi.endpoints.listPlaylists.select(query)(store.getState())
    .data;
}

function requestParts(input: RequestInfo | URL): {
  method: string;
  pathname: string;
} {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method =
    typeof input === "string" || input instanceof URL
      ? "GET"
      : (input.method ?? "GET");

  return {
    method,
    pathname: new URL(url).pathname,
  };
}

describe("playlists api cache patches", () => {
  beforeEach(async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://example.test";
    clearAuthSession(false);
    await bootstrapAccessToken();
    vi.mocked(revalidateWildfireTag).mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearAuthSession(false);
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  test("createPlaylist patches matching first-page caches without revalidating the Next cache", async () => {
    const store = makeStore();
    const matchingStatusQuery: PlaylistListQuery = {
      ...defaultQuery,
      status: "DRAFT",
    };
    const nonMatchingStatusQuery: PlaylistListQuery = {
      ...defaultQuery,
      status: "IN_USE",
    };
    const nonFirstPageQuery: PlaylistListQuery = {
      ...defaultQuery,
      page: 2,
    };
    const existing = playlistSummary({
      id: "playlist-old",
      name: "Older Playlist",
    });
    const created = playlistBase({
      id: "playlist-new",
      name: "New Playlist",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        defaultQuery,
        listResponse([existing]),
      ),
    );
    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        matchingStatusQuery,
        listResponse([existing]),
      ),
    );
    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        nonMatchingStatusQuery,
        listResponse([]),
      ),
    );
    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        nonFirstPageQuery,
        listResponse([existing], { page: 2, total: 1 }),
      ),
    );

    global.fetch = vi.fn(async (input) => {
      const { method, pathname } = requestParts(input);
      expect(method).toBe("POST");
      expect(pathname.endsWith("/playlists")).toBe(true);

      return new Response(JSON.stringify({ data: created }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await store
      .dispatch(
        playlistsApi.endpoints.createPlaylist.initiate({
          name: created.name,
          description: created.description,
        }),
      )
      .unwrap();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(revalidateWildfireTag).not.toHaveBeenCalled();
    expect(selectList(store, defaultQuery)?.items.map((p) => p.id)).toEqual([
      "playlist-new",
      "playlist-old",
    ]);
    expect(
      selectList(store, matchingStatusQuery)?.items.map((p) => p.id),
    ).toEqual(["playlist-new", "playlist-old"]);
    expect(selectList(store, nonMatchingStatusQuery)?.items).toEqual([]);
    expect(
      selectList(store, nonFirstPageQuery)?.items.map((p) => p.id),
    ).toEqual(["playlist-old"]);
    expect(selectList(store, nonFirstPageQuery)?.total).toBe(2);
  });

  test("createPlaylist skips cached search pages that do not match the created playlist name", async () => {
    const store = makeStore();
    const searchQuery: PlaylistListQuery = {
      ...defaultQuery,
      search: "morning",
    };
    const created = playlistBase({
      id: "playlist-evening",
      name: "Evening Playlist",
    });

    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        searchQuery,
        listResponse([], { total: 0 }),
      ),
    );

    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: created }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    await store
      .dispatch(
        playlistsApi.endpoints.createPlaylist.initiate({
          name: created.name,
          description: created.description,
        }),
      )
      .unwrap();

    expect(selectList(store, searchQuery)?.items).toEqual([]);
    expect(selectList(store, searchQuery)?.total).toBe(0);
  });

  test("updatePlaylist patches existing cached rows and removes rows that no longer match search", async () => {
    const store = makeStore();
    const searchQuery: PlaylistListQuery = {
      ...defaultQuery,
      search: "morning",
    };
    const existing = playlistSummary({
      id: "playlist-1",
      name: "Morning Playlist",
      description: "Old",
    });
    const updated = playlistBase({
      id: "playlist-1",
      name: "Evening Playlist",
      description: "Updated",
      itemsCount: 4,
      totalDuration: 44,
      updatedAt: "2026-03-01T00:00:00.000Z",
    });

    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        defaultQuery,
        listResponse([existing]),
      ),
    );
    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        searchQuery,
        listResponse([existing]),
      ),
    );

    global.fetch = vi.fn(async (input) => {
      const { method, pathname } = requestParts(input);
      expect(method).toBe("PATCH");
      expect(pathname.endsWith("/playlists/playlist-1")).toBe(true);

      return new Response(JSON.stringify({ data: updated }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await store
      .dispatch(
        playlistsApi.endpoints.updatePlaylist.initiate({
          id: "playlist-1",
          name: updated.name,
          description: updated.description,
        }),
      )
      .unwrap();

    const defaultItems = selectList(store, defaultQuery)?.items ?? [];
    expect(defaultItems[0]).toMatchObject({
      id: "playlist-1",
      name: "Evening Playlist",
      description: "Updated",
      itemsCount: 4,
      totalDuration: 44,
    });
    expect(selectList(store, searchQuery)?.items).toEqual([]);
    expect(selectList(store, searchQuery)?.total).toBe(0);
    expect(revalidateWildfireTag).not.toHaveBeenCalled();
  });

  test("savePlaylistItemsAtomic patches list counts, duration, and preview items", async () => {
    const store = makeStore();
    const existing = playlistSummary({
      id: "playlist-1",
      itemsCount: 1,
      totalDuration: 10,
      previewItems: [playlistItem({ id: "old-item", sequence: 10 })],
    });
    const items = [
      playlistItem({ id: "item-30", sequence: 30, duration: 30 }),
      playlistItem({ id: "item-10", sequence: 10, duration: 10 }),
      playlistItem({ id: "item-20", sequence: 20, duration: 20 }),
      playlistItem({ id: "item-40", sequence: 40, duration: 40 }),
    ];

    await store.dispatch(
      playlistsApi.util.upsertQueryData(
        "listPlaylists",
        defaultQuery,
        listResponse([existing]),
      ),
    );

    global.fetch = vi.fn(async (input) => {
      const { method, pathname } = requestParts(input);
      expect(method).toBe("PUT");
      expect(pathname.endsWith("/playlists/playlist-1/items")).toBe(true);

      return new Response(JSON.stringify({ data: items }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await store
      .dispatch(
        playlistsApi.endpoints.savePlaylistItemsAtomic.initiate({
          playlistId: "playlist-1",
          items: [],
        }),
      )
      .unwrap();

    const patched = selectList(store, defaultQuery)?.items[0];
    expect(patched?.itemsCount).toBe(4);
    expect(patched?.totalDuration).toBe(100);
    expect(patched?.previewItems.map((item) => item.sequence)).toEqual([
      10, 20, 30,
    ]);
    expect(revalidateWildfireTag).not.toHaveBeenCalled();
  });
});
