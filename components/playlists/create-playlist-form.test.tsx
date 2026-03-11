import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  CreatePlaylistForm,
  type PlaylistSelectableContent,
} from "@/components/playlists/create-playlist-form";

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
] satisfies readonly PlaylistSelectableContent[];

describe("CreatePlaylistForm", () => {
  test("renders the authoring layout without display-target fields", () => {
    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={availableContent}
      />,
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Playlist Items")).toBeInTheDocument();
    expect(screen.getByText("Content Library")).toBeInTheDocument();
    expect(screen.getByText(/Base Duration:/)).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Display Target (Optional)"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Effective Duration:")).not.toBeInTheDocument();
    expect(screen.getByTestId("create-playlist-form-root")).toHaveClass(
      "rounded-md",
      "border",
    );
  });

  test("drops the outer card shell in page surface mode", () => {
    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={availableContent}
        surface="page"
        showHeader={false}
      />,
    );

    expect(screen.getByTestId("create-playlist-form-root")).not.toHaveClass(
      "rounded-md",
      "border",
      "bg-background",
    );
  });

  test("adds and removes content from the playlist", async () => {
    const user = userEvent.setup();

    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={availableContent}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Poster" }));

    expect(screen.getByText("Poster")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Poster" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove Poster from playlist" }),
    );

    expect(
      screen.getByText("Add content from the library to get started"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poster" })).toBeInTheDocument();
  });

  test("keeps the draft when creation fails", async () => {
    const user = userEvent.setup();

    render(
      <CreatePlaylistForm
        onCreate={vi.fn(async () => false)}
        availableContent={availableContent}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
  });
});
