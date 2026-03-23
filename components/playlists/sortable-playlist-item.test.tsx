import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SortableItemRow } from "@/components/playlists/sortable-item-row";

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
  sequence: 0,
  content: {
    id: "content-1",
    title: "Poster",
    type: "IMAGE" as const,
    thumbnailUrl: null,
    checksum: "checksum-1",
  },
};

describe("SortableItemRow", () => {
  test("renders a thumbnail image when thumbnailUrl exists", () => {
    render(
      <SortableItemRow
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
      <SortableItemRow
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
