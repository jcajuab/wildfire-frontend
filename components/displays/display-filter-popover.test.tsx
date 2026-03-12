import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { DisplayFilterPopover } from "@/components/displays/display-filter-popover";

describe("DisplayFilterPopover", () => {
  beforeAll(() => {
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

  test("shows active filter count and triggers clear", async () => {
    const onStatusChange = vi.fn();
    const onGroupsChange = vi.fn();
    const onOutputChange = vi.fn();
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <DisplayFilterPopover
        statusFilter="LIVE"
        selectedGroups={["Lobby", "Hallway"]}
        selectedOutput="hdmi-1"
        filteredResultsCount={6}
        availableGroups={["Lobby", "Hallway", "Cafe"]}
        availableOutputs={["hdmi-1", "hdmi-2"]}
        onStatusChange={onStatusChange}
        onGroupsChange={onGroupsChange}
        onOutputChange={onOutputChange}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByRole("button", { name: /Filter/ })).toHaveTextContent(
      "6",
    );

    await user.click(screen.getByRole("button", { name: /Filter/ }));
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test("changes status from the popover select", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DisplayFilterPopover
        statusFilter="all"
        selectedGroups={[]}
        selectedOutput="all"
        filteredResultsCount={20}
        availableGroups={[]}
        availableOutputs={[]}
        onStatusChange={onStatusChange}
        onGroupsChange={vi.fn()}
        onOutputChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Filter$/ }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "Live" }));
    await user.click(screen.getByRole("combobox", { name: "Output" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");

    expect(onStatusChange).toHaveBeenCalledWith("LIVE");
  });
});
