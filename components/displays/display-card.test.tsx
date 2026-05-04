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
    renderDisplayCard({
      ...baseDisplay,
      groups: [
        { name: "Lobby" },
        { name: "North Wing" },
        { name: "East Hall" },
      ],
    });

    expect(
      document.querySelector('[data-group-visible="Lobby"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="North Wing"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="East Hall"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-group-overflow-visible="1"]'),
    ).toBeInTheDocument();
  });

  test("shows groups that fit without a +N badge", () => {
    renderDisplayCard({
      ...baseDisplay,
      groups: [{ name: "Lobby" }, { name: "North Wing" }],
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
  });

  test("shows missing emergency warning indicator when emergency content is not set", async () => {
    const user = userEvent.setup();
    renderDisplayCard();

    const indicator = screen.getByLabelText("Emergency content not set");
    expect(indicator).toBeInTheDocument();
    await user.hover(indicator);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Emergency content not set",
    );
  });

  test("does not show missing emergency indicator when emergency content is configured", () => {
    renderDisplayCard({ ...baseDisplay, emergencyContentId: "content-1" });

    expect(
      screen.queryByLabelText("Emergency content not set"),
    ).not.toBeInTheDocument();
  });

  test("keeps the actions menu button accessible", () => {
    renderDisplayCard();

    expect(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    ).toBeInTheDocument();
  });

  test("renders an accessible selection checkbox when selection is enabled", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderDisplayCard(baseDisplay, {
      onUnregisterDisplay: vi.fn(),
      onSelectionChange,
    });

    await user.click(
      screen.getByRole("checkbox", { name: "Select Lobby Display" }),
    );

    expect(onSelectionChange).toHaveBeenCalledWith(baseDisplay, true);
  });

  test("does not render a selection checkbox by default", () => {
    renderDisplayCard();

    expect(
      screen.queryByRole("checkbox", { name: "Select Lobby Display" }),
    ).not.toBeInTheDocument();
  });

  test("keeps emergency active and missing emergency indicators distinct", () => {
    renderDisplayCard(baseDisplay, { isGlobalEmergencyActive: true });

    expect(screen.getByText("Emergency Active")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Emergency content not set"),
    ).toBeInTheDocument();
  });
});
