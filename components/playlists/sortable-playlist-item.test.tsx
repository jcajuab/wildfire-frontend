import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SortablePlaylistItem } from "@/components/playlists/sortable-playlist-item";

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

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

const baseItem = {
  id: "draft-1",
  duration: 5,
  order: 0,
  content: {
    id: "content-1",
    title: "Poster",
    type: "IMAGE" as const,
    kind: "ROOT" as const,
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
    scrollPxPerSecond: null,
    flashMessage: null,
    flashTone: null,
    textJsonContent: null,
    textHtmlContent: null,
    status: "READY" as const,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    owner: { id: "user-1", name: "Owner" },
  },
};

describe("SortablePlaylistItem", () => {
  test("renders a thumbnail image when thumbnailUrl exists", () => {
    render(
      <SortablePlaylistItem
        item={{
          ...baseItem,
          content: {
            ...baseItem.content,
            thumbnailUrl: "https://cdn.example.com/poster.png",
          },
        }}
        onRemove={vi.fn()}
        onUpdateDuration={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Poster thumbnail")).toHaveAttribute(
      "src",
      "https://cdn.example.com/poster.png",
    );
  });

  test("renders a fallback icon when thumbnailUrl is missing", () => {
    render(
      <SortablePlaylistItem
        item={baseItem}
        onRemove={vi.fn()}
        onUpdateDuration={vi.fn()}
      />,
    );

    expect(screen.queryByAltText("Poster thumbnail")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("playlist-item-thumbnail").querySelector("svg"),
    ).toBeTruthy();
  });
});
