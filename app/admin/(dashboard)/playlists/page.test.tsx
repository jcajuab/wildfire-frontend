import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import PlaylistsPage from "./page";
import type { UsePlaylistsPageResult } from "./use-playlists-page";
import { usePlaylistsPage } from "./use-playlists-page";

const playlistGridPropsSpy = vi.hoisted(() => vi.fn());
const confirmDialogPropsSpy = vi.hoisted(() => vi.fn());

vi.mock("@/components/common/can", () => ({
  Can: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/common/confirm-action-dialog", () => ({
  ConfirmActionDialog: (props: unknown) => {
    confirmDialogPropsSpy(props);
    return null;
  },
}));

vi.mock("@/components/playlists/edit-playlist-items-dialog", () => ({
  EditPlaylistItemsDialog: () => <div>Manage Items Dialog</div>,
}));

vi.mock("@/components/playlists/playlist-grid", () => ({
  PlaylistGrid: (props: unknown) => {
    playlistGridPropsSpy(props);
    return <div>Playlist Grid</div>;
  },
}));

vi.mock("@/components/common/search-control", () => ({
  SearchControl: () => <div>Search Control</div>,
}));

vi.mock("@/components/playlists/playlist-sort-select", () => ({
  PlaylistSortSelect: () => <div>Sort Select</div>,
}));

vi.mock("@/components/playlists/playlist-status-tabs", () => ({
  PlaylistStatusTabs: () => <div>Status Tabs</div>,
}));

vi.mock("@/components/common/pagination-footer", () => ({
  PaginationFooter: () => <div>Pagination Footer</div>,
}));

vi.mock("./use-playlists-page", () => ({
  PAGE_SIZE: 12,
  usePlaylistsPage: vi.fn(),
}));

const usePlaylistsPageMock = vi.mocked(usePlaylistsPage);

beforeEach(() => {
  playlistGridPropsSpy.mockClear();
  confirmDialogPropsSpy.mockClear();
});

function createHookResult(
  overrides: Partial<UsePlaylistsPageResult> = {},
): UsePlaylistsPageResult {
  return {
    canUpdatePlaylist: true,
    canDeletePlaylist: true,
    statusFilter: "all",
    search: "",
    page: 1,
    playlists: [],
    totalPlaylists: 0,
    availableContent: [],
    availableDisplays: [],
    editorPlaylist: null,
    playlistToDelete: null,
    deleteDialogOpen: false,
    isSavingPlaylistItems: false,
    setPage: vi.fn(),
    setEditorPlaylist: vi.fn(),
    setPlaylistToDelete: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handleClearFilters: vi.fn(),
    handleSearchChange: vi.fn(),
    handleEditorDialogOpenChange: vi.fn(),
    handleOpenEditor: vi.fn(),
    handleSaveItems: vi.fn(),
    handleDeletePlaylist: vi.fn(),
    deletePlaylistMutation: vi.fn(),
    ...overrides,
  };
}

describe("PlaylistsPage", () => {
  test("renders a link-based create action to the dedicated route", () => {
    usePlaylistsPageMock.mockReturnValue(createHookResult());

    render(<PlaylistsPage />);

    const createLink = screen.getByRole("link", { name: "Create Playlist" });

    expect(createLink).toHaveAttribute("href", "/admin/playlists/create");
    expect(
      screen.queryByText("Create New Playlist"),
    ).not.toBeInTheDocument();
  });

  test("mounts only the merged editor dialog when an editor playlist is active", () => {
    usePlaylistsPageMock.mockReturnValue(
      createHookResult({
        editorPlaylist: {
        id: "playlist-1",
        name: "Playlist",
        description: null,
        status: "DRAFT",
        itemsCount: 0,
        totalDuration: 0,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        owner: { id: "user-1", name: "Owner" },
        items: [],
      },
      }),
    );

    render(<PlaylistsPage />);

    expect(screen.getByText("Manage Items Dialog")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("wires playlist grid with merged edit/manage callback and no preview callback", () => {
    const handleOpenEditor = vi.fn();

    usePlaylistsPageMock.mockReturnValue(
      createHookResult({
        canUpdatePlaylist: true,
        handleOpenEditor,
      }),
    );

    render(<PlaylistsPage />);

    expect(playlistGridPropsSpy).toHaveBeenCalledTimes(1);

    const props = playlistGridPropsSpy.mock.calls[0]?.[0] as {
      onEditManage?: unknown;
      onPreview?: unknown;
    };

    expect(props.onEditManage).toBe(handleOpenEditor);
    expect(props.onPreview).toBeUndefined();
  });

  test("closes the delete dialog by clearing the selected playlist", async () => {
    const setPlaylistToDelete = vi.fn();

    usePlaylistsPageMock.mockReturnValue(
      createHookResult({
        deleteDialogOpen: true,
        playlistToDelete: {
          id: "playlist-1",
          name: "Playlist",
          description: null,
          status: "DRAFT",
          itemsCount: 0,
          previewItems: [],
          totalDuration: 0,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          owner: { id: "user-1", name: "Owner" },
        },
        setPlaylistToDelete,
      }),
    );

    render(<PlaylistsPage />);

    const props = confirmDialogPropsSpy.mock.calls[0]?.[0] as {
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

    expect(props.open).toBe(true);
    props.onOpenChange(false);

    expect(setPlaylistToDelete).toHaveBeenCalledWith(null);
  });
});
