import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";
import { TooltipProvider } from "@/components/ui/tooltip";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("DisplayFilterPopover", () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  test("shows active filter strip and triggers clear", async () => {
    const onStatusChange = vi.fn();
    const onGroupsChange = vi.fn();
    const onOutputChange = vi.fn();
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="LIVE"
          selectedGroups={["Lobby", "Hallway"]}
          selectedOutput="hdmi-*"
          filteredResultsCount={6}
          availableGroups={["Lobby", "Hallway", "Cafe"]}
          availableOutputs={["hdmi-0", "hdmi-1"]}
          onStatusChange={onStatusChange}
          onGroupsChange={onGroupsChange}
          onOutputChange={onOutputChange}
          onClearFilters={onClearFilters}
        />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Filter displays" }),
    ).toHaveTextContent("4");

    await user.click(screen.getByRole("button", { name: "Filter displays" }));
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(
      screen.getByRole("dialog", { name: "Display filters" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Filter displays" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("6 matching displays")).not.toBeInTheDocument();
    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Output Type")).toBeInTheDocument();
    expect(screen.getByText("Display Groups")).toBeInTheDocument();
    expect(
      screen
        .getByText("Status")
        .compareDocumentPosition(screen.getByText("Active filters")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByText("STATUS")).not.toBeInTheDocument();
    expect(screen.queryByText("OUTPUT")).not.toBeInTheDocument();
    expect(screen.queryByText("GROUPS")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test("opens directly to filter controls when no filters are active", async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="all"
          selectedGroups={[]}
          selectedOutput="all"
          filteredResultsCount={20}
          availableGroups={["Lobby"]}
          availableOutputs={["hdmi-0"]}
          onStatusChange={vi.fn()}
          onGroupsChange={vi.fn()}
          onOutputChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Filter displays" }));

    expect(
      screen.getByRole("dialog", { name: "Display filters" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Filter displays" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Active filters")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Output Type")).toBeInTheDocument();
    expect(screen.getByText("Display Groups")).toBeInTheDocument();
  });

  test("changes status and output from the popover selects", async () => {
    const onStatusChange = vi.fn();
    const onOutputChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="all"
          selectedGroups={[]}
          selectedOutput="all"
          filteredResultsCount={20}
          availableGroups={[]}
          availableOutputs={["hdmi-0", "hdmi-1"]}
          onStatusChange={onStatusChange}
          onGroupsChange={vi.fn()}
          onOutputChange={onOutputChange}
          onClearFilters={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Filter displays" }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "Live" }));

    await user.click(screen.getByRole("combobox", { name: "Output Type" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "dvi-*" }));

    expect(onStatusChange).toHaveBeenCalledWith("LIVE");
    expect(onOutputChange).toHaveBeenCalledWith("dvi-*");
  });

  test("renders display group search and removes individual filter chips", async () => {
    const onStatusChange = vi.fn();
    const onGroupsChange = vi.fn();
    const onOutputChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="LIVE"
          selectedGroups={["Lobby", "Hallway"]}
          selectedOutput="hdmi-*"
          filteredResultsCount={1}
          availableGroups={["Lobby", "Hallway", "Cafe"]}
          availableOutputs={["hdmi-0", "hdmi-1"]}
          onStatusChange={onStatusChange}
          onGroupsChange={onGroupsChange}
          onOutputChange={onOutputChange}
          onClearFilters={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Filter displays" }));

    expect(screen.queryByText("1 matching display")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove Live filter" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove hdmi-* filter" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove Lobby filter" }),
    );

    expect(onStatusChange).toHaveBeenCalledWith("all");
    expect(onOutputChange).toHaveBeenCalledWith("all");
    expect(onGroupsChange).toHaveBeenCalledWith(["Hallway"]);
  });

  test("uses a professional display group search placeholder", async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="all"
          selectedGroups={[]}
          selectedOutput="all"
          filteredResultsCount={3}
          availableGroups={["Lobby", "Hallway", "Cafe"]}
          availableOutputs={[]}
          onStatusChange={vi.fn()}
          onGroupsChange={vi.fn()}
          onOutputChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Filter displays" }));

    expect(
      screen.getByPlaceholderText("Search display groups"),
    ).toBeInTheDocument();
  });

  test("hides output type controls and chips when output filtering is unavailable", async () => {
    const user = userEvent.setup();
    const onOutputChange = vi.fn();

    render(
      <TooltipProvider>
        <DisplayFilterPopover
          statusFilter="LIVE"
          selectedGroups={["Lobby", "Hallway"]}
          selectedOutput="hdmi-*"
          filteredResultsCount={3}
          availableGroups={["Lobby", "Hallway", "Cafe"]}
          availableOutputs={["hdmi-0"]}
          showOutputFilter={false}
          onStatusChange={vi.fn()}
          onGroupsChange={vi.fn()}
          onOutputChange={onOutputChange}
          onClearFilters={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Filter displays" }),
    ).toHaveTextContent("3");

    await user.click(screen.getByRole("button", { name: "Filter displays" }));

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Display Groups")).toBeInTheDocument();
    expect(screen.queryByText("Output Type")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Output Type" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove hdmi-* filter" }),
    ).not.toBeInTheDocument();
    expect(onOutputChange).not.toHaveBeenCalled();
  });
});
