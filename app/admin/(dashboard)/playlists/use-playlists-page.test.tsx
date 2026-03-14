import type { ReactElement } from "react";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePlaylistsPage } from "./use-playlists-page";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import { useListContentQuery } from "@/lib/api/content-api";
import {
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useListPlaylistsQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/hooks/use-query-state", () => ({
  useQueryEnumState: vi.fn(),
  useQueryNumberState: vi.fn(),
  useQueryStringState: vi.fn(),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  useDeletePlaylistMutation: vi.fn(),
  useLazyGetPlaylistQuery: vi.fn(),
  useListPlaylistsQuery: vi.fn(),
  useSavePlaylistItemsAtomicMutation: vi.fn(),
  useUpdatePlaylistMutation: vi.fn(),
}));

vi.mock("@/lib/api/get-api-error-message", () => ({
  notifyApiError: vi.fn(),
}));

const useCanMock = vi.mocked(useCan);
const useQueryEnumStateMock = vi.mocked(useQueryEnumState);
const useQueryStringStateMock = vi.mocked(useQueryStringState);
const useQueryNumberStateMock = vi.mocked(useQueryNumberState);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useListPlaylistsQueryMock = vi.mocked(useListPlaylistsQuery);
const useLazyGetPlaylistQueryMock = vi.mocked(useLazyGetPlaylistQuery);
const useDeletePlaylistMutationMock = vi.mocked(useDeletePlaylistMutation);
const useSavePlaylistItemsAtomicMutationMock = vi.mocked(
  useSavePlaylistItemsAtomicMutation,
);
const useUpdatePlaylistMutationMock = vi.mocked(useUpdatePlaylistMutation);
const notifyApiErrorMock = vi.mocked(notifyApiError);

const setStatusFilterMock = vi.fn();
const setSearchMock = vi.fn();
const setPageMock = vi.fn();
const loadPlaylistMock = vi.fn();
const deletePlaylistMock = vi.fn();
const updatePlaylistMock = vi.fn();
const savePlaylistItemsAtomicMock = vi.fn();

const savePayload = {
  metadata: {
    name: "Updated playlist",
    description: "Updated description",
  },
  items: [
    {
      kind: "existing" as const,
      itemId: "item-1",
      duration: 15,
    },
  ],
};

const playlistSummary = {
  id: "playlist-1",
  name: "Base Playlist",
  description: null,
  status: "DRAFT" as const,
  itemsCount: 0,
  previewItems: [],
  totalDuration: 0,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  owner: { id: "user-1", name: "Owner" },
};

function HookProbe(): ReactElement {
  const page = usePlaylistsPage();

  return (
    <div>
      <div>
        Active playlist:{" "}
        {page.editorPlaylist ? page.editorPlaylist.name : "none"}
      </div>
      <button
        type="button"
        onClick={() => void page.handleOpenEditor(playlistSummary)}
      >
        Open editor
      </button>
      <button
        type="button"
        onClick={() => page.handleEditorDialogOpenChange(false)}
      >
        Close editor
      </button>
    </div>
  );
}

describe("usePlaylistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useQueryEnumStateMock.mockImplementation((key) => {
      if (key === "status") {
        return ["DRAFT", setStatusFilterMock] as ReturnType<
          typeof useQueryEnumState
        >;
      }

      return ["all", vi.fn()] as ReturnType<typeof useQueryEnumState>;
    });
    useQueryStringStateMock.mockReturnValue([
      "morning",
      setSearchMock,
    ] as ReturnType<typeof useQueryStringState>);
    useQueryNumberStateMock.mockReturnValue([3, setPageMock] as ReturnType<
      typeof useQueryNumberState
    >);

    useListPlaylistsQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: "playlist-list-1",
            name: "Morning Loop",
            description: "Lobby loop",
            status: "DRAFT",
            itemsCount: 4,
            totalDuration: 120,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            owner: { id: "user-1", name: "Owner" },
            previewItems: [
              {
                id: "preview-1",
                sequence: 1,
                duration: 30,
                content: {
                  id: "content-preview-1",
                  title: "Welcome",
                  type: "IMAGE",
                  checksum: "preview-checksum-1",
                  thumbnailUrl: null,
                },
              },
            ],
          },
        ],
        total: 1,
      },
    } as ReturnType<typeof useListPlaylistsQuery>);
    useListContentQueryMock.mockReturnValue({
      data: { items: [] },
    } as ReturnType<typeof useListContentQuery>);

    loadPlaylistMock.mockReturnValue({
      unwrap: async () => ({
        id: "playlist-1",
        name: "Detailed Playlist",
        description: null,
        status: "DRAFT",
        itemsCount: 1,
        totalDuration: 5,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        owner: { id: "user-1", name: "Owner" },
        items: [
          {
            id: "item-1",
            sequence: 1,
            duration: 5,
            content: {
              id: "content-1",
              title: "Poster",
              type: "IMAGE",
              checksum: "checksum-1",
              thumbnailUrl: null,
            },
          },
        ],
      }),
    });

    useLazyGetPlaylistQueryMock.mockReturnValue([
      loadPlaylistMock,
    ] as unknown as ReturnType<typeof useLazyGetPlaylistQuery>);
    useDeletePlaylistMutationMock.mockReturnValue([
      deletePlaylistMock,
    ] as unknown as ReturnType<typeof useDeletePlaylistMutation>);
    updatePlaylistMock.mockReturnValue({
      unwrap: async () => undefined,
    });
    savePlaylistItemsAtomicMock.mockReturnValue({
      unwrap: async () => [],
    });
    useUpdatePlaylistMutationMock.mockReturnValue([
      updatePlaylistMock,
    ] as unknown as ReturnType<typeof useUpdatePlaylistMutation>);
    useSavePlaylistItemsAtomicMutationMock.mockReturnValue([
      savePlaylistItemsAtomicMock,
    ] as unknown as ReturnType<typeof useSavePlaylistItemsAtomicMutation>);
  });

  test("uses fixed recent sorting and clears status filters", () => {
    const { result } = renderHook(() => usePlaylistsPage());

    expect(useListPlaylistsQueryMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 12,
      status: "DRAFT",
      search: "morning",
      sortBy: "updatedAt",
      sortDirection: "desc",
    });

    expect(result.current.playlists[0]?.previewItems).toHaveLength(1);
    expect(
      result.current.playlists[0]?.previewItems[0]?.content.thumbnailUrl,
    ).toBeNull();

    act(() => {
      result.current.handleClearFilters();
    });

    expect(setStatusFilterMock).toHaveBeenCalledWith("all");
    expect(setPageMock).toHaveBeenCalledWith(1);
  });

  test("opens editor with loaded playlist data", async () => {
    const user = userEvent.setup();

    render(<HookProbe />);

    expect(screen.getByText("Active playlist: none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open editor" }));

    await waitFor(() => {
      expect(
        screen.getByText("Active playlist: Detailed Playlist"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Close editor" }));

    expect(screen.getByText("Active playlist: none")).toBeInTheDocument();
  });

  test("saves metadata first, then playlist items, and closes on full success", async () => {
    const callOrder: string[] = [];

    updatePlaylistMock.mockImplementation(() => {
      callOrder.push("metadata");
      return { unwrap: async () => undefined };
    });
    savePlaylistItemsAtomicMock.mockImplementation(() => {
      callOrder.push("items");
      return { unwrap: async () => [] };
    });

    const { result } = renderHook(() => usePlaylistsPage());

    await act(async () => {
      await result.current.handleOpenEditor(playlistSummary);
    });

    expect(result.current.editorPlaylist?.name).toBe("Detailed Playlist");

    await act(async () => {
      await result.current.handleSaveItems("playlist-1", savePayload);
    });

    expect(updatePlaylistMock).toHaveBeenCalledWith({
      id: "playlist-1",
      name: "Updated playlist",
      description: "Updated description",
    });
    expect(savePlaylistItemsAtomicMock).toHaveBeenCalledWith({
      playlistId: "playlist-1",
      items: savePayload.items,
    });
    expect(callOrder).toEqual(["metadata", "items"]);
    expect(result.current.editorPlaylist).toBeNull();
  });

  test("aborts item save when metadata update fails and keeps editor open", async () => {
    updatePlaylistMock.mockReturnValue({
      unwrap: async () => {
        throw new Error("metadata failed");
      },
    });

    const { result } = renderHook(() => usePlaylistsPage());

    await act(async () => {
      await result.current.handleOpenEditor(playlistSummary);
    });

    await act(async () => {
      await result.current.handleSaveItems("playlist-1", savePayload);
    });

    expect(savePlaylistItemsAtomicMock).not.toHaveBeenCalled();
    expect(result.current.editorPlaylist?.name).toBe("Detailed Playlist");
    expect(notifyApiErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to update playlist info.",
    );
  });

  test("keeps editor open and shows partial-save error when item save fails", async () => {
    savePlaylistItemsAtomicMock.mockReturnValue({
      unwrap: async () => {
        throw new Error("items failed");
      },
    });

    const { result } = renderHook(() => usePlaylistsPage());

    await act(async () => {
      await result.current.handleOpenEditor(playlistSummary);
    });

    await act(async () => {
      await result.current.handleSaveItems("playlist-1", savePayload);
    });

    expect(updatePlaylistMock).toHaveBeenCalledTimes(1);
    expect(savePlaylistItemsAtomicMock).toHaveBeenCalledTimes(1);
    expect(result.current.editorPlaylist?.name).toBe("Detailed Playlist");
    expect(notifyApiErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      "Playlist info saved, but item changes failed. Review items and save again.",
    );
  });

  test("skips content query without content-read and keeps editor usable", async () => {
    useCanMock.mockImplementation(
      (permission) => permission !== "content:read",
    );

    const { result } = renderHook(() => usePlaylistsPage());

    expect(useListContentQueryMock).toHaveBeenCalledWith(
      { page: 1, pageSize: 100 },
      { skip: true },
    );
    expect(result.current.availableContent).toEqual([]);

    await act(async () => {
      await result.current.handleOpenEditor(playlistSummary);
    });

    expect(result.current.editorPlaylist?.name).toBe("Detailed Playlist");
  });
});
