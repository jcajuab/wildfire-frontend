import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { PlaylistsToolbar } from "@/components/playlists/playlists-toolbar";

type PlaylistsToolbarProps = ComponentProps<typeof PlaylistsToolbar>;

const baseProps: PlaylistsToolbarProps = {
  statusFilter: "all" as const,
  ownerFilter: "all",
  sortFilter: "newest" as const,
  search: "",
  filteredResultsCount: 4,
  isFetching: false,
  canCreatePlaylist: true,
  canDeletePlaylist: true,
  bulkState: {
    mode: "normal" as const,
    onEnterBulkDelete: vi.fn(),
  },
  onSearchChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onOwnerFilterChange: vi.fn(),
  onSortFilterChange: vi.fn(),
  onClearFilters: vi.fn(),
};

function renderToolbar(props: Partial<PlaylistsToolbarProps> = {}) {
  return render(<PlaylistsToolbar {...baseProps} {...props} />);
}

describe("PlaylistsToolbar", () => {
  beforeAll(() => {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  test("renders the compact playlists header controls", () => {
    renderToolbar();

    expect(
      screen.getByRole("heading", { name: "Playlists" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search playlists" }),
    ).toHaveAttribute("placeholder", "Search by playlist name");
    expect(
      screen.getByRole("button", { name: "Filter playlists" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bulk Delete" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Playlist" }),
    ).toHaveAttribute("href", "/admin/playlists/create");
  });

  test("opens filters from the merged search control", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Filter playlists" }));

    expect(screen.getByLabelText("Playlist filters")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Status" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort" })).toBeInTheDocument();
  });

  test("renders bulk delete row and keeps primary create action visible", () => {
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 0,
        onDelete: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.queryByRole("button", { name: "Bulk Delete" })).toBeNull();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Selected" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Playlist" }),
    ).toBeInTheDocument();
  });

  test("gates create and delete controls by permission", () => {
    renderToolbar({
      canCreatePlaylist: false,
      canDeletePlaylist: false,
    });

    expect(screen.queryByRole("link", { name: "Create Playlist" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bulk Delete" })).toBeNull();
  });

  test("routes normal bulk trigger to handler", async () => {
    const user = userEvent.setup();
    const onEnterBulkDelete = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "normal",
        onEnterBulkDelete,
      },
    });

    await user.click(screen.getByRole("button", { name: "Bulk Delete" }));

    expect(onEnterBulkDelete).toHaveBeenCalledTimes(1);
  });

  test("routes active bulk actions to handlers", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 2,
        onDelete,
        onCancel,
      },
    });

    const header = screen.getByRole("banner");
    await user.click(
      within(header).getByRole("button", { name: "Delete Selected" }),
    );
    await user.click(within(header).getByRole("button", { name: "Cancel" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
