import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import PlaylistsPage from "./page";
import { usePlaylistsPage } from "./use-playlists-page";

vi.mock("@/components/common/can", () => ({
  Can: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/common/confirm-action-dialog", () => ({
  ConfirmActionDialog: () => null,
}));

vi.mock("@/components/playlists/edit-playlist-items-dialog", () => ({
  EditPlaylistItemsDialog: () => <div>Manage Items Dialog</div>,
}));

vi.mock("@/components/playlists/playlist-grid", () => ({
  PlaylistGrid: () => <div>Playlist Grid</div>,
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

describe("PlaylistsPage", () => {
  test("renders a link-based create action to the dedicated route", () => {
    usePlaylistsPageMock.mockReturnValue({
      canUpdatePlaylist: true,
      canDeletePlaylist: true,
      statusFilter: "all",
      sortBy: "recent",
      search: "",
      page: 1,
      playlists: [],
      totalPlaylists: 0,
      availableContent: [],
      availableDisplays: [],
      previewPlaylist: null,
      editPlaylist: null,
      manageItemsPlaylist: null,
      playlistToDelete: null,
      deleteDialogOpen: false,
      editName: "",
      editDescription: "",
      isSavingPlaylistItems: false,
      setPage: vi.fn(),
      setEditPlaylist: vi.fn(),
      setPreviewPlaylist: vi.fn(),
      setPlaylistToDelete: vi.fn(),
      setEditName: vi.fn(),
      setEditDescription: vi.fn(),
      handleStatusFilterChange: vi.fn(),
      handleSortChange: vi.fn(),
      handleSearchChange: vi.fn(),
      handleManageItemsDialogOpenChange: vi.fn(),
      handleEditPlaylist: vi.fn(),
      handleManageItems: vi.fn(),
      handleSaveItems: vi.fn(),
      handlePreviewPlaylist: vi.fn(),
      handleDeletePlaylist: vi.fn(),
      handleUpdatePlaylist: vi.fn(),
      deletePlaylistMutation: vi.fn(),
    });

    render(<PlaylistsPage />);

    const createLink = screen.getByRole("link", { name: "Create Playlist" });

    expect(createLink).toHaveAttribute("href", "/admin/playlists/create");
    expect(
      screen.queryByText("Create New Playlist"),
    ).not.toBeInTheDocument();
  });

  test("preserves the manage-items dialog path after removing create modal wiring", () => {
    usePlaylistsPageMock.mockReturnValue({
      canUpdatePlaylist: true,
      canDeletePlaylist: true,
      statusFilter: "all",
      sortBy: "recent",
      search: "",
      page: 1,
      playlists: [],
      totalPlaylists: 0,
      availableContent: [],
      availableDisplays: [],
      previewPlaylist: null,
      editPlaylist: null,
      manageItemsPlaylist: {
        id: "playlist-1",
        name: "Playlist",
        description: null,
        status: "DRAFT",
        itemCount: 0,
        totalDuration: 0,
        updatedAt: "2025-01-01T00:00:00.000Z",
        items: [],
      },
      playlistToDelete: null,
      deleteDialogOpen: false,
      editName: "",
      editDescription: "",
      isSavingPlaylistItems: false,
      setPage: vi.fn(),
      setEditPlaylist: vi.fn(),
      setPreviewPlaylist: vi.fn(),
      setPlaylistToDelete: vi.fn(),
      setEditName: vi.fn(),
      setEditDescription: vi.fn(),
      handleStatusFilterChange: vi.fn(),
      handleSortChange: vi.fn(),
      handleSearchChange: vi.fn(),
      handleManageItemsDialogOpenChange: vi.fn(),
      handleEditPlaylist: vi.fn(),
      handleManageItems: vi.fn(),
      handleSaveItems: vi.fn(),
      handlePreviewPlaylist: vi.fn(),
      handleDeletePlaylist: vi.fn(),
      handleUpdatePlaylist: vi.fn(),
      deletePlaylistMutation: vi.fn(),
    });

    render(<PlaylistsPage />);

    expect(screen.getByText("Manage Items Dialog")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
