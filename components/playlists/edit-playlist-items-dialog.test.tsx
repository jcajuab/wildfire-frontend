import { useState, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { EditPlaylistItemsDialog } from "@/components/playlists/edit-playlist-items-dialog";
import type { Display } from "@/lib/api/displays-api";
import { useEstimatePlaylistDurationMutation } from "@/lib/api/playlists-api";
import type { Content } from "@/types/content";
import type { Playlist } from "@/types/playlist";

vi.mock("@/lib/api/playlists-api", () => ({
  useEstimatePlaylistDurationMutation: vi.fn(),
}));

const useEstimatePlaylistDurationMutationMock = vi.mocked(
  useEstimatePlaylistDurationMutation,
);

const estimatePlaylistDurationMock = vi.fn(() => ({
  unwrap: async () => ({
    baseDurationSeconds: 0,
    scrollExtraSeconds: 0,
    effectiveDurationSeconds: 0,
  }),
}));

const availableDisplays: readonly Display[] = [
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
];

const availableContent = [
  {
    id: "content-2",
    title: "Replacement Poster",
    type: "IMAGE",
    kind: "ROOT",
    mimeType: "image/png",
    fileSize: 100,
    checksum: "checksum-2",
    parentContentId: null,
    pageNumber: null,
    pageCount: null,
    isExcluded: false,
    width: 1920,
    height: 1080,
    duration: 5,
    scrollPxPerSecond: null,
    flashMessage: null,
    flashTone: null,
    status: "READY",
    createdAt: "2025-01-01T00:00:00.000Z",
    owner: { id: "user-1", name: "Owner" },
  },
] satisfies readonly (Content & { readonly type: "IMAGE" })[];

function makePlaylist(id: string, title: string): Playlist {
  return {
    id,
    name: `${title} Playlist`,
    description: null,
    status: "DRAFT",
    itemsCount: 1,
    totalDuration: 5,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    owner: { id: "user-1", name: "Owner" },
    items: [
      {
        id: `${id}-item-1`,
        content: {
          id: `${id}-content-1`,
          title,
          type: "IMAGE",
          checksum: `${id}-checksum`,
        },
        duration: 5,
        order: 0,
      },
    ],
  };
}

function EditPlaylistDialogHarness(): ReactElement {
  const [open, setOpen] = useState(true);
  const [playlist] = useState(() => makePlaylist("playlist-a", "Alpha"));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <EditPlaylistItemsDialog
        open={open}
        onOpenChange={setOpen}
        playlist={playlist}
        availableContent={availableContent}
        availableDisplays={availableDisplays}
        onSave={vi.fn()}
      />
    </>
  );
}

async function dismissDialog(
  mode: "button" | "overlay" | "escape",
  user: ReturnType<typeof userEvent.setup>,
) {
  if (mode === "button") {
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  } else if (mode === "escape") {
    await user.keyboard("{Escape}");
  } else {
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeTruthy();
    fireEvent.pointerDown(overlay as Element);
    fireEvent.click(overlay as Element);
  }

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
}

describe("EditPlaylistItemsDialog", () => {
  test.each(["button", "overlay", "escape"] as const)(
    "restores removed items when dismissed via %s",
    async (mode) => {
      useEstimatePlaylistDurationMutationMock.mockReturnValue([
        estimatePlaylistDurationMock,
        { isLoading: false },
      ] as unknown as ReturnType<typeof useEstimatePlaylistDurationMutation>);

      const user = userEvent.setup();

      render(<EditPlaylistDialogHarness />);

      await user.click(
        screen.getByRole("button", { name: "Remove Alpha from playlist" }),
      );
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

      await dismissDialog(mode, user);

      await user.click(screen.getByRole("button", { name: "Reopen" }));

      expect(screen.getByText("Alpha")).toBeInTheDocument();
    },
  );

  test("rehydrates drafts when the playlist changes while open", async () => {
    useEstimatePlaylistDurationMutationMock.mockReturnValue([
      estimatePlaylistDurationMock,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useEstimatePlaylistDurationMutation>);

    const { rerender } = render(
      <EditPlaylistItemsDialog
        open={true}
        onOpenChange={vi.fn()}
        playlist={makePlaylist("playlist-a", "Alpha")}
        availableContent={availableContent}
        availableDisplays={availableDisplays}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();

    rerender(
      <EditPlaylistItemsDialog
        open={true}
        onOpenChange={vi.fn()}
        playlist={makePlaylist("playlist-b", "Beta")}
        availableContent={availableContent}
        availableDisplays={availableDisplays}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});
