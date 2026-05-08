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

  test("shows active filter strip when status filter is applied and triggers clear", async () => {
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="DRAFT"
        ownerFilter="all"
        sortFilter="newest"
        filteredResultsCount={6}
        onStatusFilterChange={vi.fn()}
        onOwnerFilterChange={vi.fn()}
        onSortFilterChange={vi.fn()}
        onClearFilters={onClearFilters}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filter playlists" }),
    ).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Filter playlists" }));
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Draft filter" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test("changes status from the status select", async () => {
    const onStatusFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="all"
        ownerFilter="all"
        sortFilter="newest"
        filteredResultsCount={12}
        onStatusFilterChange={onStatusFilterChange}
        onOwnerFilterChange={vi.fn()}
        onSortFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter playlists" }));
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    await user.click(screen.getByRole("option", { name: "In use" }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("IN_USE");
  });

  test("changes sort and admin-only owner filters", async () => {
    const onOwnerFilterChange = vi.fn();
    const onSortFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="all"
        ownerFilter="all"
        sortFilter="newest"
        filteredResultsCount={12}
        canFilterByOwner
        ownerOptions={[
          {
            id: "00000000-0000-4000-8000-000000000001",
            username: "admin",
          },
        ]}
        onStatusFilterChange={vi.fn()}
        onOwnerFilterChange={onOwnerFilterChange}
        onSortFilterChange={onSortFilterChange}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter playlists" }));
    await user.click(screen.getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "Name A-Z" }));
    await user.click(screen.getByRole("combobox", { name: "Created By" }));
    await user.click(screen.getByRole("option", { name: "@admin" }));

    expect(onSortFilterChange).toHaveBeenCalledWith("name-asc");
    expect(onOwnerFilterChange).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  test("renders embedded trigger inside a supplied anchor", async () => {
    const user = userEvent.setup();

    render(
      <PlaylistFilterPopover
        statusFilter="all"
        ownerFilter="all"
        sortFilter="newest"
        filteredResultsCount={12}
        embeddedTrigger
        renderEmbeddedAnchor={(trigger) => (
          <div>
            <span>Search anchor</span>
            {trigger}
          </div>
        )}
        onStatusFilterChange={vi.fn()}
        onOwnerFilterChange={vi.fn()}
        onSortFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter playlists" }));

    expect(screen.getByLabelText("Playlist filters")).toBeInTheDocument();
  });
});
