import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { PlaylistFilterPopover } from "@/components/playlists/playlist-filter-popover";

describe("PlaylistFilterPopover", () => {
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

  test("shows active count when status filter is applied and triggers clear", async () => {
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="DRAFT"
        filteredResultsCount={6}
        onStatusFilterChange={vi.fn()}
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

  test("changes status from the status select", async () => {
    const onStatusFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="all"
        filteredResultsCount={12}
        onStatusFilterChange={onStatusFilterChange}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Filter$/ }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "In Use" }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("IN_USE");
  });
});
