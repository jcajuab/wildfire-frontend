import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { DisplayCard } from "@/components/displays/display-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Display } from "@/types/display";

vi.mock("@/components/displays/display-preview", () => ({
  DisplayPreview: ({ displayName }: { displayName: string }) => (
    <div data-testid="display-preview">{displayName} preview</div>
  ),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth",
);
const originalGetBoundingClientRect =
  HTMLElement.prototype.getBoundingClientRect;

function mockGroupOverflowLayout({
  containerWidth,
  groupWidths,
  overflowWidths,
}: {
  containerWidth: number;
  groupWidths: Record<string, number>;
  overflowWidths: Record<string, number>;
}) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      const element = this as HTMLElement;
      if (element.dataset.groupOverflowContainer === "true") {
        return containerWidth;
      }

      return originalClientWidth?.get?.call(this) ?? 0;
    },
  });

  HTMLElement.prototype.getBoundingClientRect = function () {
    const element = this as HTMLElement;
    const groupWidth = element.dataset.groupMeasure
      ? groupWidths[element.dataset.groupMeasure]
      : undefined;
    const overflowWidth = element.dataset.groupOverflowMeasure
      ? overflowWidths[element.dataset.groupOverflowMeasure]
      : undefined;
    const width = groupWidth ?? overflowWidth;

    if (width !== undefined) {
      return {
        width,
        height: 20,
        top: 0,
        left: 0,
        right: width,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      } as DOMRect;
    }

    return originalGetBoundingClientRect.call(this);
  };
}

function restoreGroupOverflowLayoutMocks() {
  if (originalClientWidth) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientWidth",
      originalClientWidth,
    );
  }
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
}

const baseDisplay: Display = {
  id: "display-1",
  slug: "lobby-display",
  name: "Lobby Display",
  status: "LIVE",
  location: "Main Hall",
  ipAddress: "10.0.0.20",
  macAddress: "AA:BB:CC:DD:EE:FF",
  output: "hdmi-0",
  resolution: "1920x1080",
  emergencyContentId: null,
  groups: [
    {
      name: "Lobby",
      colorIndex: 0,
    },
  ],
  nowPlaying: null,
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("DisplayCard", () => {
  const renderDisplayCard = (display: Display = baseDisplay, props = {}) =>
    render(
      <TooltipProvider>
        <DisplayCard
          display={display}
          onViewDetails={vi.fn()}
          onViewPage={vi.fn()}
          {...props}
        />
      </TooltipProvider>,
    );

  test("shows preview label and display output metadata", () => {
    renderDisplayCard();

    expect(screen.getByText("hdmi-0")).toBeInTheDocument();
    expect(screen.getByText("1920x1080")).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="separator"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="Lobby"]'),
    ).toBeInTheDocument();
  });

  test("collapses extra groups into a +N badge", () => {
    mockGroupOverflowLayout({
      containerWidth: 120,
      groupWidths: {
        Lobby: 48,
        "North Wing": 86,
        "East Hall": 72,
      },
      overflowWidths: {
        "1": 36,
        "2": 36,
      },
    });

    renderDisplayCard({
      ...baseDisplay,
      groups: [
        { name: "Lobby", colorIndex: 0 },
        { name: "North Wing", colorIndex: 1 },
        { name: "East Hall", colorIndex: 2 },
      ],
    });

    expect(
      document.querySelector('[data-group-visible="Lobby"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-overflow-visible="2"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="North Wing"]'),
    ).not.toBeInTheDocument();

    restoreGroupOverflowLayoutMocks();
  });

  test("shows groups that fit without a +N badge", () => {
    mockGroupOverflowLayout({
      containerWidth: 220,
      groupWidths: {
        Lobby: 48,
        "North Wing": 86,
      },
      overflowWidths: {
        "1": 36,
      },
    });

    renderDisplayCard({
      ...baseDisplay,
      groups: [
        { name: "Lobby", colorIndex: 0 },
        { name: "North Wing", colorIndex: 1 },
      ],
    });

    expect(
      document.querySelector('[data-group-visible="Lobby"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="North Wing"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-overflow-visible="1"]'),
    ).not.toBeInTheDocument();

    restoreGroupOverflowLayoutMocks();
  });

  test("shows missing emergency warning indicator when emergency content is not set", async () => {
    const user = userEvent.setup();
    renderDisplayCard();

    const indicator = screen.getByLabelText("Emergency not set");
    expect(indicator).toBeInTheDocument();
    await user.hover(indicator);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Emergency not set",
    );
  });

  test("does not show missing emergency indicator when emergency content is configured", () => {
    renderDisplayCard({ ...baseDisplay, emergencyContentId: "content-1" });

    expect(
      screen.queryByLabelText("Emergency not set"),
    ).not.toBeInTheDocument();
  });

  test("keeps the actions menu button accessible", () => {
    renderDisplayCard();

    expect(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    ).toBeInTheDocument();
  });

  test("keeps emergency active and missing emergency indicators distinct", () => {
    renderDisplayCard(baseDisplay, { isGlobalEmergencyActive: true });

    expect(screen.getByText("Emergency Active")).toBeInTheDocument();
    expect(screen.getByLabelText("Emergency not set")).toBeInTheDocument();
  });
});
