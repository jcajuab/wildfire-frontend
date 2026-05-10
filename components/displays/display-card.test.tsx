import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
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
  output: "hdmi-0",
  groups: [
    {
      name: "Lobby",
    },
  ],
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("DisplayCard", () => {
  const renderDisplayCard = (
    display: Display = baseDisplay,
    props: Partial<ComponentProps<typeof DisplayCard>> = {},
  ) =>
    render(
      <TooltipProvider>
        <DisplayCard display={display} onViewPage={vi.fn()} {...props} />
      </TooltipProvider>,
    );

  test("shows output metadata for users who can create displays", () => {
    renderDisplayCard(baseDisplay, { showOutputMetadata: true });

    expect(screen.getByText("hdmi-0")).toBeInTheDocument();
    expect(screen.queryByText("1920x1080")).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-group-visible="Lobby"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Lobby")).toHaveClass("bg-primary/10");
    expect(screen.getByText("Lobby")).toHaveClass("text-primary");
    expect(screen.getByText("Lobby")).not.toHaveClass("bg-blue-600");
  });

  test("hides output metadata by default", () => {
    renderDisplayCard();

    expect(screen.queryByText("hdmi-0")).not.toBeInTheDocument();
    expect(screen.queryByText("1920x1080")).not.toBeInTheDocument();
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

  test("does not show missing emergency warning indicator", () => {
    renderDisplayCard();

    expect(
      screen.queryByLabelText("Emergency content not set"),
    ).not.toBeInTheDocument();
  });

  test("hides the actions menu when no management actions are available", () => {
    renderDisplayCard();

    expect(
      screen.queryByRole("button", { name: "Actions for Lobby Display" }),
    ).not.toBeInTheDocument();
  });

  test("keeps the actions menu button accessible when management actions exist", () => {
    renderDisplayCard(baseDisplay, { onEditDisplay: vi.fn() });

    expect(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    ).toBeInTheDocument();
  });

  test("keeps only management actions in the card menu", async () => {
    const user = userEvent.setup();
    renderDisplayCard(baseDisplay, {
      onEditDisplay: vi.fn(),
      onUnregisterDisplay: vi.fn(),
    });

    await user.click(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    );

    expect(
      screen.queryByRole("menuitem", { name: "More Details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "View Display Page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Edit Display" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Unregister Display" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]'),
    ).toBeInTheDocument();
  });

  test("does not show a separator when only unregister is available", async () => {
    const user = userEvent.setup();
    renderDisplayCard(baseDisplay, {
      onUnregisterDisplay: vi.fn(),
    });

    await user.click(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    );

    expect(
      screen.queryByRole("menuitem", { name: "Edit Display" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Unregister Display" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]'),
    ).not.toBeInTheDocument();
  });

  test("opens the display page from the preview overlay", async () => {
    const user = userEvent.setup();
    const onViewPage = vi.fn();
    renderDisplayCard(baseDisplay, { onViewPage });

    const previewAction = screen.getByRole("button", {
      name: "View Display Page for Lobby Display",
    });

    expect(previewAction).toHaveClass("cursor-pointer");
    expect(previewAction).toHaveClass(
      "bg-[color-mix(in_oklab,var(--primary)_10%,var(--background))]",
    );
    expect(previewAction).toHaveClass("transition-opacity");
    expect(previewAction).not.toHaveClass("hover:bg-foreground/45");

    await user.click(previewAction);

    expect(onViewPage).toHaveBeenCalledWith(baseDisplay);
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

  test("mutes unselected cards in selection mode", () => {
    renderDisplayCard(baseDisplay, {
      onUnregisterDisplay: vi.fn(),
      onSelectionChange: vi.fn(),
    });

    const card = screen
      .getByRole("heading", { name: "Lobby Display" })
      .closest("[data-selection-mode='true']");
    expect(card).toBeInstanceOf(HTMLElement);
    expect(card).toHaveAttribute("data-selection-mode", "true");
    expect(card).toHaveAttribute("data-selection-muted", "true");
    expect(card).toHaveClass("opacity-55");
    expect(card).toHaveClass("grayscale");
    expect(card).toHaveClass("hover:opacity-90");
    expect(card).toHaveClass("hover:grayscale-0");
  });

  test("keeps selected cards visually prominent in selection mode", () => {
    renderDisplayCard(baseDisplay, {
      isSelected: true,
      onUnregisterDisplay: vi.fn(),
      onSelectionChange: vi.fn(),
    });

    const card = screen
      .getByRole("heading", { name: "Lobby Display" })
      .closest("[data-selection-mode='true']");
    expect(card).toBeInstanceOf(HTMLElement);
    expect(card).toHaveAttribute("data-state", "selected");
    expect(card).not.toHaveAttribute("data-selection-muted");
    expect(card).toHaveClass("data-[state=selected]:opacity-100");
    expect(card).toHaveClass("data-[state=selected]:grayscale-0");
  });

  test("toggles selection when clicking the card body in selection mode", async () => {
    const user = userEvent.setup();
    const onViewPage = vi.fn();
    const onSelectionChange = vi.fn();
    renderDisplayCard(baseDisplay, {
      onViewPage,
      onUnregisterDisplay: vi.fn(),
      onSelectionChange,
    });

    expect(
      screen.queryByRole("button", {
        name: "View Display Page for Lobby Display",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("display-preview"));

    expect(onSelectionChange).toHaveBeenCalledWith(baseDisplay, true);
    expect(onViewPage).not.toHaveBeenCalled();
  });

  test("toggles selection from the keyboard when the checkbox is focused", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderDisplayCard(baseDisplay, {
      onUnregisterDisplay: vi.fn(),
      onSelectionChange,
    });

    screen.getByRole("checkbox", { name: "Select Lobby Display" }).focus();
    await user.keyboard(" ");

    expect(onSelectionChange).toHaveBeenCalledWith(baseDisplay, true);
  });

  test("does not toggle selection when clicking card actions in selection mode", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderDisplayCard(baseDisplay, {
      onUnregisterDisplay: vi.fn(),
      onSelectionChange,
    });

    await user.click(
      screen.getByRole("button", { name: "Actions for Lobby Display" }),
    );

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  test("disables the actions menu during bulk unregister mode", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderDisplayCard(baseDisplay, {
      onEditDisplay: vi.fn(),
      onUnregisterDisplay: vi.fn(),
      onSelectionChange,
      isSelectionMode: true,
    });

    const actions = screen.getByRole("button", {
      name: "Actions for Lobby Display",
    });

    expect(actions).toBeDisabled();

    await user.click(actions);

    expect(
      screen.queryByRole("menuitem", { name: "Edit Display" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Unregister Display" }),
    ).not.toBeInTheDocument();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  test("does not render a selection checkbox by default", () => {
    renderDisplayCard();

    expect(
      screen.queryByRole("checkbox", { name: "Select Lobby Display" }),
    ).not.toBeInTheDocument();
  });

  test("renders the emergency active badge when global emergency is on", () => {
    renderDisplayCard(baseDisplay, { isGlobalEmergencyActive: true });

    expect(screen.getByText("Emergency Active")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Emergency content not set"),
    ).not.toBeInTheDocument();
  });
});
