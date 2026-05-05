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

    expect(
      screen.getByRole("button", { name: "Filter content" }),
    ).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Filter content" }));
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Videos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Showing 6 matching results")).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Filter content" }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(
      screen.getByRole("option", { name: "All statuses" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Ready" }));
    await user.click(screen.getByRole("combobox", { name: "Content Type" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(
      screen.getByRole("option", { name: "All content types" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["All content types", "Text", "Images", "Videos", "Flash"]);
    await user.click(screen.getByRole("option", { name: "Videos" }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("READY");
    expect(onTypeFilterChange).toHaveBeenCalledWith("VIDEO");
  });

  test("removes individual active filters from the footer", async () => {
    const onStatusFilterChange = vi.fn();
    const onTypeFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ContentFilterPopover
        statusFilter="READY"
        typeFilter="VIDEO"
        filteredResultsCount={6}
        onStatusFilterChange={onStatusFilterChange}
        onTypeFilterChange={onTypeFilterChange}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter content" }));
    await user.click(
      screen.getByRole("button", { name: "Remove Ready filter" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove Videos filter" }),
    );

    expect(onStatusFilterChange).toHaveBeenCalledWith("all");
    expect(onTypeFilterChange).toHaveBeenCalledWith("all");
  });
});
