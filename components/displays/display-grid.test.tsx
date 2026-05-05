import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";

import { DisplayGrid } from "@/components/displays/display-grid";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Display } from "@/types/display";

vi.mock("@/components/displays/display-preview", () => ({
  DisplayPreview: ({ displayName }: { displayName: string }) => (
    <div>{displayName} preview</div>
  ),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

function makeDisplay(index: number): Display {
  return {
    id: `display-${index}`,
    slug: `display-${index}`,
    name: `Display ${index}`,
    status: "READY",
    location: null,
    ipAddress: null,
    macAddress: null,
    output: "HDMI",
    resolution: "1920x1080",
    groups: [],
    nowPlaying: null,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

function renderGrid(
  count: number,
  props: Partial<ComponentProps<typeof DisplayGrid>> = {},
): HTMLElement {
  render(
    <TooltipProvider>
      <DisplayGrid
        items={Array.from({ length: count }, (_, index) =>
          makeDisplay(index + 1),
        )}
        onViewPage={vi.fn()}
        {...props}
      />
    </TooltipProvider>,
  );

  const firstCardAction = screen.getByRole("button", {
    name: "Actions for Display 1",
  });

  return firstCardAction.closest(".grid") as HTMLElement;
}

describe("DisplayGrid", () => {
  test.each([1, 2, 3, 4, 5, 8])(
    "uses stable auto-fill columns with %i display cards",
    (count) => {
      const grid = renderGrid(count);

      expect(grid).toHaveClass(
        "grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]",
      );
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(count);
    },
  );

  test("passes output metadata visibility to display cards", () => {
    renderGrid(1, { showOutputMetadata: true });

    expect(screen.getByText("HDMI")).toBeInTheDocument();
    expect(screen.queryByText("1920x1080")).not.toBeInTheDocument();
  });

  test("hides output metadata unless explicitly enabled", () => {
    renderGrid(1);

    expect(screen.queryByText("HDMI")).not.toBeInTheDocument();
    expect(screen.queryByText("1920x1080")).not.toBeInTheDocument();
  });
});
