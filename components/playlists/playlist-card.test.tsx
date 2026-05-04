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
  itemsCount: 0,
  totalDuration: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  owner: {
    id: "user-1",
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

  test("does not render a selection checkbox by default", () => {
    render(<PlaylistCard playlist={basePlaylist} onDelete={vi.fn()} />);

    expect(
      screen.queryByRole("checkbox", { name: "Select Morning Loop" }),
    ).not.toBeInTheDocument();
  });
});
