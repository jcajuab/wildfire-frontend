import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import type { PlaylistSummary } from "@/types/playlist";

vi.mock("@/hooks/use-can-modify-resource", () => ({
  useCanModifyResource: vi.fn(() => true),
}));

const basePlaylist: PlaylistSummary = {
  id: "playlist-1",
  name: "Morning Loop",
  description: "Morning content",
  status: "DRAFT",
  showCounter: false,
  itemsCount: 0,
  totalDuration: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  owner: {
    id: "user-1",
    username: "demo",
    name: "Demo User",
  },
  previewItems: [],
};

describe("PlaylistCard", () => {
  test("renders an accessible selection checkbox when selection is enabled", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <PlaylistCard
        playlist={basePlaylist}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Select Morning Loop" }),
    );

    expect(onSelectionChange).toHaveBeenCalledWith(basePlaylist, true);
  });

  test("toggles selection from the whole card in selection mode", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <PlaylistCard
        playlist={basePlaylist}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Select Morning Loop" }),
    );

    expect(onSelectionChange).toHaveBeenCalledWith(basePlaylist, true);
  });

  test("does not render a selection checkbox by default", () => {
    render(<PlaylistCard playlist={basePlaylist} onDelete={vi.fn()} />);

    expect(
      screen.queryByRole("checkbox", { name: "Select Morning Loop" }),
    ).not.toBeInTheDocument();
  });

  test("shows the consolidated latest activity row", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          updatedAt: "2024-01-02T00:00:00.000Z",
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText("Created at")).not.toBeInTheDocument();
    expect(screen.queryByText("Updated at")).not.toBeInTheDocument();
    expect(screen.getByText("@demo")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });

  test("renders playlist status and stats in one badge row", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          status: "IN_USE",
          itemsCount: 4,
          totalDuration: 20,
        }}
        onDelete={vi.fn()}
      />,
    );

    const inUseBadge = screen.getByText("In Use");
    const itemsBadge = screen.getByText("4 items").closest("[data-slot=badge]");
    const durationBadge = screen
      .getByText("0:20 sec")
      .closest("[data-slot=badge]");

    expect(inUseBadge).toHaveClass("border-destructive/30");
    expect(inUseBadge).toHaveClass("text-destructive");
    expect(itemsBadge).toHaveClass("border-foreground/15");
    expect(itemsBadge?.querySelector("svg")).not.toBeInTheDocument();
    expect(durationBadge).toHaveClass("border-foreground/15");
    expect(durationBadge?.querySelector("svg")).not.toBeInTheDocument();
  });

  test("shows draft status for draft playlists", () => {
    render(<PlaylistCard playlist={basePlaylist} onDelete={vi.fn()} />);

    const draftBadge = screen.getByText("Draft");

    expect(draftBadge).toHaveClass("border-border");
    expect(draftBadge).toHaveClass("text-muted-foreground");
  });

  test("keeps playlist card hover borders neutral", () => {
    render(
      <PlaylistCard
        playlist={basePlaylist}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", { name: "Select Morning Loop" });

    expect(card).toHaveClass("hover:border-border");
    expect(card.className).not.toContain("hover:border-primary");
  });

  test("falls back to the owner name when username is unavailable", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          owner: {
            id: "user-1",
            name: "Demo User",
          },
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("@Demo User")).toBeInTheDocument();
  });

  test("renders text preview content without raw html", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          itemsCount: 1,
          totalDuration: 5,
          previewItems: [
            {
              id: "item-1",
              duration: 5,
              sequence: 1,
              loop: false,
              content: {
                id: "content-1",
                title: "Announcement",
                type: "TEXT",
                checksum: "checksum-1",
                thumbnailUrl: null,
                textPreviewText: "Breaking News",
              },
            },
          ],
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Breaking News")).toBeInTheDocument();
    expect(
      screen.queryByText("<strong>Breaking</strong>"),
    ).not.toBeInTheDocument();
  });

  test("shows two preview thumbnails and summarizes the remaining items", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          itemsCount: 4,
          totalDuration: 20,
          previewItems: [
            {
              id: "item-1",
              duration: 5,
              sequence: 1,
              loop: false,
              content: {
                id: "content-1",
                title: "First",
                type: "IMAGE",
                checksum: "checksum-1",
                thumbnailUrl: null,
              },
            },
            {
              id: "item-2",
              duration: 5,
              sequence: 2,
              loop: false,
              content: {
                id: "content-2",
                title: "Second",
                type: "IMAGE",
                checksum: "checksum-2",
                thumbnailUrl: null,
              },
            },
            {
              id: "item-3",
              duration: 5,
              sequence: 3,
              loop: false,
              content: {
                id: "content-3",
                title: "Third",
                type: "IMAGE",
                checksum: "checksum-3",
                thumbnailUrl: null,
              },
            },
          ],
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("Third")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  test("does not show an overflow tile when all playlist items are visible", () => {
    render(
      <PlaylistCard
        playlist={{
          ...basePlaylist,
          itemsCount: 2,
          totalDuration: 10,
          previewItems: [
            {
              id: "item-1",
              duration: 5,
              sequence: 1,
              loop: false,
              content: {
                id: "content-1",
                title: "First",
                type: "IMAGE",
                checksum: "checksum-1",
                thumbnailUrl: null,
              },
            },
            {
              id: "item-2",
              duration: 5,
              sequence: 2,
              loop: false,
              content: {
                id: "content-2",
                title: "Second",
                type: "IMAGE",
                checksum: "checksum-2",
                thumbnailUrl: null,
              },
            },
          ],
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  test("separates edit and destructive delete actions", async () => {
    const user = userEvent.setup();

    render(
      <PlaylistCard
        playlist={basePlaylist}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Actions for Morning Loop" }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Edit Playlist" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete Playlist" }),
    ).toBeInTheDocument();
  });

  test("disables the actions menu during bulk delete mode", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <PlaylistCard
        playlist={basePlaylist}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
        isSelectionMode
      />,
    );

    const actions = screen.getByRole("button", {
      name: "Actions for Morning Loop",
    });

    expect(actions).toBeDisabled();

    await user.click(actions);

    expect(
      screen.queryByRole("menuitem", { name: "Edit Playlist" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Delete Playlist" }),
    ).not.toBeInTheDocument();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
