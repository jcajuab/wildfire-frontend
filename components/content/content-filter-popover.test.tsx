import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { ContentFilterPopover } from "@/components/content/content-filter-popover";

describe("ContentFilterPopover", () => {
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
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <ContentFilterPopover
        statusFilter="READY"
        typeFilter="VIDEO"
        filteredResultsCount={6}
        onStatusFilterChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
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

  test("changes status and type from dropdown controls", async () => {
    const onStatusFilterChange = vi.fn();
    const onTypeFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ContentFilterPopover
        statusFilter="all"
        typeFilter="all"
        filteredResultsCount={12}
        onStatusFilterChange={onStatusFilterChange}
        onTypeFilterChange={onTypeFilterChange}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Filter$/ }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "Ready" }));
    await user.click(screen.getByRole("combobox", { name: "Type" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "Videos" }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("READY");
    expect(onTypeFilterChange).toHaveBeenCalledWith("VIDEO");
  });
});
