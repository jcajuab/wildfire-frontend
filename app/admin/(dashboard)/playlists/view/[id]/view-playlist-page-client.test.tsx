import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { playlistsApi } from "@/lib/api/playlists-api";
import { makeStore } from "@/lib/store";
import { ViewPlaylistPageView } from "./view-playlist-page-client";

const routerBackMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: routerBackMock,
  }),
}));

function renderViewPlaylistPage() {
  const store = makeStore();
  store.dispatch(
    playlistsApi.util.upsertQueryData("getPlaylist", "playlist-1", {
      id: "playlist-1",
      name: "Morning Loop",
      description: "Lobby announcements for the morning.",
      status: "IN_USE",
      showCounter: true,
      itemsCount: 2,
      totalDuration: 20,
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
      owner: {
        id: "user-1",
        username: "jane",
        name: "Jane Doe",
      },
      items: [
        {
          id: "item-2",
          sequence: 2,
          duration: 15,
          loop: false,
          content: {
            id: "content-2",
            title: "Lunch reminder",
            type: "TEXT",
            checksum: "checksum-2",
            duration: null,
            thumbnailUrl: null,
            textPreviewText: "Lunch starts at noon.",
          },
        },
        {
          id: "item-1",
          sequence: 1,
          duration: 5,
          loop: false,
          content: {
            id: "content-1",
            title: "Welcome message",
            type: "TEXT",
            checksum: "checksum-1",
            duration: null,
            thumbnailUrl: null,
            textPreviewText: "Welcome to campus.",
          },
        },
      ],
    }),
  );

  render(
    <Provider store={store}>
      <ViewPlaylistPageView playlistId="playlist-1" />
    </Provider>,
  );
}

describe("ViewPlaylistPageView", () => {
  beforeEach(() => {
    routerBackMock.mockReset();
  });

  test("renders playlist metadata and ordered read-only items", async () => {
    renderViewPlaylistPage();

    expect(
      await screen.findByRole("heading", { name: "View Playlist" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Morning Loop")).toBeInTheDocument();
    expect(
      screen.getByText("Lobby announcements for the morning."),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("In Use")).toBeInTheDocument();
    expect(screen.getByText("On")).toBeInTheDocument();

    const itemButtons = screen.getAllByRole("button", {
      name: /message|reminder/i,
    });
    expect(itemButtons[0]).toHaveTextContent("Welcome message");
    expect(itemButtons[1]).toHaveTextContent("Lunch reminder");
  });

  test("goes back through browser history from the header", async () => {
    const user = userEvent.setup();
    renderViewPlaylistPage();

    await user.click(await screen.findByRole("button", { name: "Go Back" }));

    expect(routerBackMock).toHaveBeenCalledTimes(1);
  });

  test("opens an inline preview for selected text content", async () => {
    const user = userEvent.setup();
    renderViewPlaylistPage();

    await user.click(
      await screen.findByRole("button", { name: /Lunch reminder/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Lunch reminder" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Lunch starts at noon.").length).toBeGreaterThan(
      1,
    );
  });

  test("does not render edit controls on the view-only page", () => {
    renderViewPlaylistPage();

    expect(
      screen.queryByRole("button", { name: /save changes/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add content/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /back to playlists/i }),
    ).not.toBeInTheDocument();
  });
});
