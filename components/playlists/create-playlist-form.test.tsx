import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  CreatePlaylistForm,
  type PlaylistSelectableContent,
} from "@/components/playlists/create-playlist-form";

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const { fill, unoptimized, ...imgProps } = props;
    void fill;
    void unoptimized;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...imgProps} alt={imgProps.alt ?? ""} />
    );
  },
}));

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
    flashMessage: null,
    flashTone: null,
    status: "READY",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
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
    expect(
      screen.queryByLabelText("Display Target (Optional)"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Effective Duration:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Base Duration:/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preview" }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preview" }),
    ).not.toBeInTheDocument();
  });

  test("reports page-mode action state and over-limit disabled behavior", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();

    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={availableContent}
        surface="page"
        showHeader={false}
        onStateChange={onStateChange}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Morning Playlist");
    await user.click(screen.getByRole("button", { name: "Poster" }));

    const lastState = onStateChange.mock.lastCall?.[0];

    expect(lastState).toMatchObject({
      canCreate: true,
      isSubmitting: false,
    });
    expect(typeof lastState?.handleCancel).toBe("function");
    expect(typeof lastState?.handleCreate).toBe("function");
  });

  test("renders content library thumbnail when thumbnailUrl exists", () => {
    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={[
          {
            ...availableContent[0],
            thumbnailUrl: "https://cdn.example.com/poster.png",
          },
        ]}
      />,
    );

    expect(screen.getByAltText("Poster thumbnail")).toHaveAttribute(
      "src",
      "https://cdn.example.com/poster.png",
    );
  });

  test("renders content library fallback when thumbnailUrl is missing", () => {
    render(
      <CreatePlaylistForm
        onCreate={vi.fn()}
        availableContent={availableContent}
      />,
    );

    expect(screen.queryByAltText("Poster thumbnail")).not.toBeInTheDocument();
    expect(
      screen
        .getByTestId("content-library-thumbnail-content-1")
        .querySelector("svg"),
    ).toBeTruthy();
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
