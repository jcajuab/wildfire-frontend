import { useState, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { CreatePlaylistDialog } from "@/components/playlists/create-playlist-dialog";
import type { Display } from "@/lib/api/displays-api";
import { useEstimatePlaylistDurationMutation } from "@/lib/api/playlists-api";
import type { Content } from "@/types/content";

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
    id: "content-1",
    title: "Poster",
    type: "IMAGE",
    kind: "ROOT",
    mimeType: "image/png",
    fileSize: 100,
    checksum: "checksum-1",
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

function CreatePlaylistDialogHarness(): ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <CreatePlaylistDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={vi.fn()}
        availableContent={availableContent}
        availableDisplays={availableDisplays}
      />
    </>
  );
}

function FailedCreatePlaylistDialogHarness(): ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <CreatePlaylistDialog
      open={open}
      onOpenChange={setOpen}
      onCreate={vi.fn(async () => false)}
      availableContent={availableContent}
      availableDisplays={availableDisplays}
    />
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

describe("CreatePlaylistDialog", () => {
  test.each(["button", "overlay", "escape"] as const)(
    "resets draft state when dismissed via %s",
    async (mode) => {
      useEstimatePlaylistDurationMutationMock.mockReturnValue([
        estimatePlaylistDurationMock,
        { isLoading: false },
      ] as unknown as ReturnType<typeof useEstimatePlaylistDurationMutation>);

      const user = userEvent.setup();

      render(<CreatePlaylistDialogHarness />);

      await user.type(screen.getByLabelText("Name"), "Morning Playlist");
      await user.type(
        screen.getByLabelText("Description (Optional)"),
        "Temporary description",
      );

      await dismissDialog(mode, user);

      await user.click(screen.getByRole("button", { name: "Reopen" }));

      expect(screen.getByLabelText("Name")).toHaveValue("");
      expect(screen.getByLabelText("Description (Optional)")).toHaveValue("");
    },
  );

  test("keeps the draft open when creation fails", async () => {
    useEstimatePlaylistDurationMutationMock.mockReturnValue([
      estimatePlaylistDurationMock,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useEstimatePlaylistDurationMutation>);

    const user = userEvent.setup();

    render(<FailedCreatePlaylistDialogHarness />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
  });
});
