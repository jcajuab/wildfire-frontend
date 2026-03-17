import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CreatePlaylistPage from "./page";
import { useListContentQuery } from "@/lib/api/content-api";
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useSavePlaylistItemsAtomicMutation,
} from "@/lib/api/playlists-api";
import { useCan } from "@/hooks/use-can";
import { useRouter } from "next/navigation";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { toast } from "sonner";

const pushMock = vi.fn();
const createPlaylistMock = vi.fn();
const deletePlaylistMock = vi.fn();
const savePlaylistItemsAtomicMock = vi.fn();

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
  useListContentQuery: vi.fn(),
}));

vi.mock("@/lib/api/playlists-api", () => ({
  useCreatePlaylistMutation: vi.fn(),
  useDeletePlaylistMutation: vi.fn(),
  useSavePlaylistItemsAtomicMutation: vi.fn(),
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
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useCreatePlaylistMutationMock = vi.mocked(useCreatePlaylistMutation);
const useDeletePlaylistMutationMock = vi.mocked(useDeletePlaylistMutation);
const useSavePlaylistItemsAtomicMutationMock = vi.mocked(
  useSavePlaylistItemsAtomicMutation,
);
const notifyApiErrorMock = vi.mocked(notifyApiError);
const toastSuccessMock = vi.mocked(toast.success);

describe("CreatePlaylistPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    useRouterMock.mockReturnValue({
      push: pushMock,
    } as ReturnType<typeof useRouter>);

    useCanMock.mockImplementation(
      (permission) => permission === "content:read",
    );

    useListContentQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: "content-1",
            title: "Poster",
            type: "IMAGE",
            kind: "ROOT",
            thumbnailUrl: null,
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
            flashMessage: null,
            flashTone: null,
            textJsonContent: null,
            textHtmlContent: null,
            status: "READY",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            owner: { id: "user-1", name: "Owner" },
          },
        ],
      },
    } as ReturnType<typeof useListContentQuery>);

    createPlaylistMock.mockReturnValue({
      unwrap: async () => ({ id: "playlist-1" }),
    });
    deletePlaylistMock.mockReturnValue({
      unwrap: async () => undefined,
    });
    savePlaylistItemsAtomicMock.mockReturnValue({
      unwrap: async () => [],
    });

    useCreatePlaylistMutationMock.mockReturnValue([
      createPlaylistMock,
    ] as unknown as ReturnType<typeof useCreatePlaylistMutation>);
    useDeletePlaylistMutationMock.mockReturnValue([
      deletePlaylistMock,
    ] as unknown as ReturnType<typeof useDeletePlaylistMutation>);
    useSavePlaylistItemsAtomicMutationMock.mockReturnValue([
      savePlaylistItemsAtomicMock,
    ] as unknown as ReturnType<typeof useSavePlaylistItemsAtomicMutation>);
  });

  test("renders the dedicated create page and cancels back to playlists", async () => {
    const user = userEvent.setup();

    render(<CreatePlaylistPage />);

    expect(
      screen.getByRole("heading", { name: "Create Playlist" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    const formRoot = screen.getByTestId("create-playlist-form-root");
    const header = screen.getByRole("banner");

    expect(formRoot).not.toHaveClass("rounded-md", "border", "bg-background");
    expect(formRoot.parentElement).toHaveClass(
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-hidden",
    );
    expect(formRoot.parentElement).not.toHaveClass("px-6", "py-6", "sm:px-8");
    expect(formRoot).toHaveClass("overflow-auto", "px-6", "py-6", "sm:px-8");
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

    render(<CreatePlaylistPage />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(notifyApiErrorMock).toHaveBeenCalled();
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("creates a name-only playlist and navigates back to playlists", async () => {
    const user = userEvent.setup();

    render(<CreatePlaylistPage />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Playlist created.");
    });
    expect(createPlaylistMock).toHaveBeenCalledWith({
      name: "Morning Playlist",
      description: null,
    });
    expect(savePlaylistItemsAtomicMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/admin/playlists");
  });

  test("shows creating state in the page header while submitting", async () => {
    const user = userEvent.setup();

    createPlaylistMock.mockReturnValueOnce({
      unwrap: () => new Promise(() => undefined),
    });

    render(<CreatePlaylistPage />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  test("rolls back the playlist when saving added items fails", async () => {
    const user = userEvent.setup();

    savePlaylistItemsAtomicMock.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error("item save failed");
      },
    });

    render(<CreatePlaylistPage />);

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(deletePlaylistMock).toHaveBeenCalled();
    });

    expect(deletePlaylistMock).toHaveBeenCalledWith("playlist-1");
    expect(notifyApiErrorMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Morning Playlist");
    expect(screen.getByText("Poster")).toBeInTheDocument();
  });
});
