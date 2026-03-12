import type { ReactElement } from "react";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
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
import { useGetDisplaysQuery } from "@/lib/api/displays-api";
import {
  useDeletePlaylistMutation,
  useLazyGetPlaylistQuery,
  useListPlaylistsQuery,
  useSavePlaylistItemsAtomicMutation,
  useUpdatePlaylistMutation,
} from "@/lib/api/playlists-api";

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

vi.mock("@/lib/api/displays-api", () => ({
  useGetDisplaysQuery: vi.fn(),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  useDeletePlaylistMutation: vi.fn(),
  useLazyGetPlaylistQuery: vi.fn(),
  useListPlaylistsQuery: vi.fn(),
  useSavePlaylistItemsAtomicMutation: vi.fn(),
  useUpdatePlaylistMutation: vi.fn(),
}));

const useCanMock = vi.mocked(useCan);
const useQueryEnumStateMock = vi.mocked(useQueryEnumState);
const useQueryStringStateMock = vi.mocked(useQueryStringState);
const useQueryNumberStateMock = vi.mocked(useQueryNumberState);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useGetDisplaysQueryMock = vi.mocked(useGetDisplaysQuery);
const useListPlaylistsQueryMock = vi.mocked(useListPlaylistsQuery);
const useLazyGetPlaylistQueryMock = vi.mocked(useLazyGetPlaylistQuery);
const useUpdatePlaylistMutationMock = vi.mocked(useUpdatePlaylistMutation);
const useDeletePlaylistMutationMock = vi.mocked(useDeletePlaylistMutation);
const useSavePlaylistItemsAtomicMutationMock = vi.mocked(
  useSavePlaylistItemsAtomicMutation,
);

const setStatusFilterMock = vi.fn();
const setSearchMock = vi.fn();
const setPageMock = vi.fn();
const loadPlaylistMock = vi.fn();

function HookProbe(): ReactElement {
  const page = usePlaylistsPage();

  return (
    <div>
      <div>Displays: {page.availableDisplays.length}</div>
      <div>
        Active playlist: {page.manageItemsPlaylist ? page.manageItemsPlaylist.name : "none"}
      </div>
      <button
        type="button"
        onClick={() =>
          void page.handleManageItems({
            id: "playlist-1",
            name: "Base Playlist",
            description: null,
            status: "DRAFT",
            itemsCount: 0,
            items: [],
            totalDuration: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            owner: { id: "user-1", name: "Owner" },
          })
        }
      >
        Open manage items
      </button>
      <button
        type="button"
        onClick={() => page.handleManageItemsDialogOpenChange(false)}
      >
        Close manage items
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
        return ["DRAFT", setStatusFilterMock] as ReturnType<typeof useQueryEnumState>;
      }

      return ["all", vi.fn()] as ReturnType<typeof useQueryEnumState>;
    });
    useQueryStringStateMock.mockReturnValue([
      "morning",
      setSearchMock,
    ] as ReturnType<typeof useQueryStringState>);
    useQueryNumberStateMock.mockReturnValue([
      3,
      setPageMock,
    ] as ReturnType<typeof useQueryNumberState>);

    useListPlaylistsQueryMock.mockReturnValue({
      data: { items: [], total: 0 },
    } as ReturnType<typeof useListPlaylistsQuery>);
    useGetDisplaysQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: "display-1",
            slug: "lobby",
            name: "Lobby",
            location: null,
            ipAddress: null,
            macAddress: null,
            screenWidth: 1920,
            screenHeight: 1080,
            output: "hdmi-0",
            orientation: "LANDSCAPE",
            lastSeenAt: null,
            status: "READY",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      },
    } as ReturnType<typeof useGetDisplaysQuery>);
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
            },
          },
        ],
      }),
    });

    useLazyGetPlaylistQueryMock.mockReturnValue([
      loadPlaylistMock,
    ] as unknown as ReturnType<typeof useLazyGetPlaylistQuery>);
    useUpdatePlaylistMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useUpdatePlaylistMutation>);
    useDeletePlaylistMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useDeletePlaylistMutation>);
    useSavePlaylistItemsAtomicMutationMock.mockReturnValue([
      vi.fn(),
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

    act(() => {
      result.current.handleClearFilters();
    });

    expect(setStatusFilterMock).toHaveBeenCalledWith("all");
    expect(setPageMock).toHaveBeenCalledWith(1);
  });

  test("preserves displays data and manage-items behavior after removing create state", async () => {
    const user = userEvent.setup();

    render(<HookProbe />);

    expect(screen.getByText("Displays: 1")).toBeInTheDocument();
    expect(screen.getByText("Active playlist: none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open manage items" }));

    await waitFor(() => {
      expect(screen.getByText("Active playlist: Detailed Playlist")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Close manage items" }));

    expect(screen.getByText("Active playlist: none")).toBeInTheDocument();
  });
});
