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
    expect(screen.getByText("|")).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toBeInTheDocument();
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

    expect(screen.queryByLabelText("Emergency not set")).not.toBeInTheDocument();
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
