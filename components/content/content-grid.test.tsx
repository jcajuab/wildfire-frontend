import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ContentGrid } from "@/components/content/content-grid";
import type { Content } from "@/types/content";

vi.mock("@/hooks/use-can-modify-resource", () => ({
  useCanModifyResource: vi.fn(() => true),
}));

function makeContent(index: number): Content {
  return {
    id: `content-${index}`,
    title: `Content ${index}`,
    type: "IMAGE",
    mimeType: "image/png",
    fileSize: 123,
    checksum: `checksum-${index}`,
    width: null,
    height: null,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textJsonContent: null,
    textHtmlContent: null,
    status: "READY",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    owner: {
      id: "user-1",
      name: "Demo User",
    },
  };
}

function renderGrid(count: number): HTMLElement {
  render(
    <ContentGrid
      items={Array.from({ length: count }, (_, index) =>
        makeContent(index + 1),
      )}
    />,
  );

  const firstCard = screen
    .getByRole("heading", { name: "Content 1" })
    .closest('[id^="content-card-"]');

  return firstCard?.parentElement as HTMLElement;
}

describe("ContentGrid", () => {
  test.each([1, 2, 3, 4, 5, 8])(
    "uses stable display-sized auto-fill columns with %i content cards",
    (count) => {
      const grid = renderGrid(count);

      expect(grid).toHaveClass(
        "grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]",
      );
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(count);
    },
  );
});
