import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  loop: false,
  content: {
    id: "content-1",
    title: "Poster",
    type: "IMAGE" as const,
    thumbnailUrl: null,
    checksum: "checksum-1",
    duration: null,
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

  test("renders a plain text preview when text content has no thumbnail", () => {
    render(
      <SortableItemRow
        item={{
          ...baseItem,
          content: {
            ...baseItem.content,
            title: "Announcement",
            type: "TEXT",
            textPreviewText: "Breaking News",
            textHtmlContent: null,
          },
        }}
        onRemove={vi.fn()}
        onUpdateDuration={vi.fn()}
      />,
    );

    expect(
      screen.queryByAltText("Announcement thumbnail"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("playlist-item-thumbnail").textContent).toContain(
      "Breaking News",
    );
    expect(
      screen.getByTestId("playlist-item-thumbnail").querySelector("svg"),
    ).toBeFalsy();
  });

  test("emphasizes the duration control and keeps it editable", async () => {
    const user = userEvent.setup();
    const onUpdateDuration = vi.fn();

    render(
      <SortableItemRow
        item={baseItem}
        onRemove={vi.fn()}
        onUpdateDuration={onUpdateDuration}
      />,
    );

    const durationInput = screen.getByLabelText(
      "Duration in seconds for Poster",
    );
    expect(screen.queryByText("Duration")).not.toBeInTheDocument();
    expect(durationInput).toHaveClass("font-medium", "tabular-nums");
    expect(screen.queryByText(/Max \d+ sec/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Poster from playlist" }),
    ).toHaveClass("text-destructive");

    await user.clear(durationInput);
    await user.type(durationInput, "15");

    expect(onUpdateDuration).toHaveBeenLastCalledWith("draft-1", 15);
  });

  test("increments and decrements duration with compact controls", async () => {
    const user = userEvent.setup();
    const onUpdateDuration = vi.fn();

    render(
      <SortableItemRow
        item={baseItem}
        onRemove={vi.fn()}
        onUpdateDuration={onUpdateDuration}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Increase duration for Poster" }),
    );
    expect(onUpdateDuration).toHaveBeenLastCalledWith("draft-1", 6);

    await user.click(
      screen.getByRole("button", { name: "Decrease duration for Poster" }),
    );
    expect(onUpdateDuration).toHaveBeenLastCalledWith("draft-1", 4);
  });

  test("does not decrement below one second", () => {
    render(
      <SortableItemRow
        item={{ ...baseItem, duration: 1 }}
        onRemove={vi.fn()}
        onUpdateDuration={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Decrease duration for Poster" }),
    ).toBeDisabled();
  });

  test("hides loop controls and clamps video duration to source duration", async () => {
    const user = userEvent.setup();
    const onUpdateDuration = vi.fn();

    render(
      <SortableItemRow
        item={{
          ...baseItem,
          duration: 8,
          loop: true,
          content: {
            ...baseItem.content,
            title: "Campus Video",
            type: "VIDEO",
            duration: 8,
          },
        }}
        onRemove={vi.fn()}
        onUpdateDuration={onUpdateDuration}
      />,
    );

    expect(screen.queryByLabelText("Loop video")).not.toBeInTheDocument();
    expect(screen.getByText("Max 8 sec")).toBeInTheDocument();

    const durationInput = screen.getByLabelText(
      "Duration in seconds for Campus Video",
    );
    expect(durationInput).toHaveAttribute("max", "8");
    expect(
      screen.getByRole("button", {
        name: "Increase duration for Campus Video",
      }),
    ).toBeDisabled();

    await user.clear(durationInput);
    await user.type(durationInput, "12");
    expect(onUpdateDuration).toHaveBeenLastCalledWith("draft-1", 8);
    await user.tab();
    expect(durationInput).toHaveValue(8);

    await user.clear(durationInput);
    await user.type(durationInput, "5");
    expect(onUpdateDuration).toHaveBeenLastCalledWith("draft-1", 5);
  });
});
