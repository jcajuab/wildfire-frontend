import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CreatePlaylistPageView } from "./create-playlist-page-client";
import { useGetContentOptionsQuery } from "@/lib/api/content-api";
import { useCreatePlaylistMutation } from "@/lib/api/playlists-api";
import { useCan } from "@/hooks/use-can";
import { useRouter } from "next/navigation";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { toast } from "sonner";

const pushMock = vi.fn();
const createPlaylistMock = vi.fn();

function findAncestorWithClasses(
  element: HTMLElement,
  classNames: string[],
): HTMLElement | null {
  let current = element.parentElement;

  while (current) {
    if (
      classNames.every((className) => current!.classList.contains(className))
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: vi.fn(),
  };
});

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/lib/api/content-api", () => ({
  useGetContentOptionsQuery: vi.fn(),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  useCreatePlaylistMutation: vi.fn(),
}));

vi.mock("@/lib/api/get-api-error-message", () => ({
  notifyApiError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const useRouterMock = vi.mocked(useRouter);
const useCanMock = vi.mocked(useCan);
const useGetContentOptionsQueryMock = vi.mocked(useGetContentOptionsQuery);
const useCreatePlaylistMutationMock = vi.mocked(useCreatePlaylistMutation);
const notifyApiErrorMock = vi.mocked(notifyApiError);
const toastSuccessMock = vi.mocked(toast.success);

describe("CreatePlaylistPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    useRouterMock.mockReturnValue({
      push: pushMock,
    } as unknown as ReturnType<typeof useRouter>);

    useCanMock.mockImplementation(
      (permission) => permission === "content:read",
    );

    useGetContentOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "content-1",
          title: "Poster",
          type: "IMAGE",
          thumbnailUrl: null,
          textPreviewText: null,
        },
      ],
    } as unknown as ReturnType<typeof useGetContentOptionsQuery>);

    createPlaylistMock.mockReturnValue({
      unwrap: async () => ({ id: "playlist-1" }),
    });

    useCreatePlaylistMutationMock.mockReturnValue([
      createPlaylistMock,
    ] as unknown as ReturnType<typeof useCreatePlaylistMutation>);
  });

  test("renders the dedicated create page and cancels back to playlists", async () => {
    const user = userEvent.setup();

    render(<CreatePlaylistPageView />);

    expect(
      screen.getByRole("heading", { name: "Create Playlist" }),
    ).toBeInTheDocument();
    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toBeInTheDocument();
    const header = screen.getByRole("banner");

    const contentShell = findAncestorWithClasses(nameInput, [
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-hidden",
    ]);
    const scrollWrapper = findAncestorWithClasses(nameInput, [
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "gap-6",
      "overflow-auto",
      "p-4",
    ]);

    expect(contentShell).not.toBeNull();
    expect(contentShell).not.toHaveClass("px-6", "py-6", "sm:px-8");
    expect(scrollWrapper).not.toBeNull();
    expect(header).toContainElement(
      screen.getByRole("button", { name: "Cancel" }),
    );
    expect(header).toContainElement(
      screen.getByRole("button", { name: "Create" }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(pushMock).toHaveBeenCalledWith("/admin/playlists");
  });

  test("keeps the draft on the page when creation fails", async () => {
    const user = userEvent.setup();
    createPlaylistMock.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error("create failed");
      },
    });

    render(<CreatePlaylistPageView />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(notifyApiErrorMock).toHaveBeenCalled();
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("keeps create disabled until at least one content item is added", async () => {
    const user = userEvent.setup();

    render(<CreatePlaylistPageView />);

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Poster" }));

    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  test("creates a playlist with content and navigates back to playlists", async () => {
    const user = userEvent.setup();

    render(<CreatePlaylistPageView />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Successfully created playlist",
      );
    });
    expect(createPlaylistMock).toHaveBeenCalledWith({
      name: "Morning Playlist",
      description: null,
      showCounter: false,
      items: [
        {
          contentId: "content-1",
          duration: 5,
          loop: false,
        },
      ],
    });
    expect(pushMock).toHaveBeenCalledWith("/admin/playlists");
  });

  test("shows creating state in the page header while submitting", async () => {
    const user = userEvent.setup();

    createPlaylistMock.mockReturnValueOnce({
      unwrap: () => new Promise(() => undefined),
    });

    render(<CreatePlaylistPageView />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  test("keeps added items on the page when creation fails", async () => {
    const user = userEvent.setup();

    createPlaylistMock.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error("create failed");
      },
    });

    render(<CreatePlaylistPageView />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(notifyApiErrorMock).toHaveBeenCalled();
    });
    expect(notifyApiErrorMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
    expect(screen.getByText("Poster")).toBeInTheDocument();
  });
});
