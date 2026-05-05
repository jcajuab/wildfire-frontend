import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { ContentToolbar } from "@/components/content/content-toolbar";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const baseProps = {
  statusFilter: "all" as const,
  typeFilter: "all" as const,
  search: "",
  filteredResultsCount: 8,
  canCreateContent: true,
  canDeleteContent: true,
  bulkState: {
    mode: "normal" as const,
    onEnterBulkDelete: vi.fn(),
  },
  onSearchChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onTypeFilterChange: vi.fn(),
  onClearFilters: vi.fn(),
  onCreateText: vi.fn(),
  onCreateUpload: vi.fn(),
  onCreateFlash: vi.fn(),
};

function renderToolbar(props: Partial<typeof baseProps> = {}) {
  return render(<ContentToolbar {...baseProps} {...props} />);
}

describe("ContentToolbar", () => {
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

  test("renders the compact content header controls", () => {
    renderToolbar();

    expect(screen.getAllByRole("heading", { name: "Content" })).toHaveLength(1);
    expect(
      screen.getByRole("textbox", { name: "Search content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by title or owner"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter content" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Filter content" })
        .closest('[data-slot="input-group"]'),
    ).toBe(
      screen
        .getByRole("textbox", { name: "Search content" })
        .closest('[data-slot="input-group"]'),
    );
    expect(
      screen.getByRole("button", { name: "Create Content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bulk Delete" }),
    ).toBeInTheDocument();
  });

  test("opens filters from the merged search control", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Filter content" }));

    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-side", "bottom");
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).toHaveAttribute("data-align", "end");
    expect(
      screen.getByRole("dialog", { name: "Content filters" }),
    ).toBeInTheDocument();
  });

  test("routes create menu items to the correct handlers", async () => {
    const user = userEvent.setup();
    const onCreateText = vi.fn();
    const onCreateUpload = vi.fn();
    const onCreateFlash = vi.fn();
    renderToolbar({ onCreateText, onCreateUpload, onCreateFlash });

    await user.click(screen.getByRole("button", { name: "Create Content" }));
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toHaveClass(
      "w-[var(--radix-dropdown-menu-trigger-width)]",
      "min-w-[var(--radix-dropdown-menu-trigger-width)]",
      "max-w-[var(--radix-dropdown-menu-trigger-width)]",
    );
    await user.click(screen.getByRole("menuitem", { name: "Text" }));
    expect(onCreateText).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Create Content" }));
    await user.click(screen.getByRole("menuitem", { name: "Upload" }));
    expect(onCreateUpload).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Create Content" }));
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Flash" }));
    expect(onCreateFlash).toHaveBeenCalledTimes(1);
  });

  test("enters bulk delete mode from the toolbar button", async () => {
    const user = userEvent.setup();
    const onEnterBulkDelete = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "normal",
        onEnterBulkDelete,
      },
    });

    const bulkDelete = screen.getByRole("button", { name: "Bulk Delete" });
    expect(bulkDelete).toHaveAttribute("data-variant", "outline");
    expect(bulkDelete).toHaveAttribute("data-size", "default");
    expect(bulkDelete).toHaveClass("text-destructive");

    await user.click(bulkDelete);
    expect(onEnterBulkDelete).toHaveBeenCalledTimes(1);
  });

  test("does not show a leading create icon", () => {
    renderToolbar();

    const createButton = screen.getByRole("button", {
      name: "Create Content",
    });

    expect(createButton).toHaveAttribute("data-size", "default");
    expect(
      createButton.querySelector(".tabler-icon-plus"),
    ).not.toBeInTheDocument();
  });

  test("places create content after bulk delete in the action group", () => {
    renderToolbar();

    expect(
      screen
        .getByRole("button", { name: "Bulk Delete" })
        .compareDocumentPosition(
          screen.getByRole("button", { name: "Create Content" }),
        ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("keeps primary controls visible while showing bulk action strip", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 2,
        onDelete,
        onCancel,
      },
    });

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Content" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bulk Delete" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Selected" }),
    ).toHaveAttribute("data-variant", "destructive");
    expect(
      screen.getByRole("button", { name: "Delete Selected" }),
    ).toHaveAttribute("data-size", "default");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "data-size",
      "default",
    );

    await user.click(screen.getByRole("button", { name: "Delete Selected" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("disables delete selected when no content is selected", () => {
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 0,
        onDelete: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Selected" }),
    ).toBeDisabled();
  });

  test("respects create and delete permission gates", () => {
    renderToolbar({ canCreateContent: false, canDeleteContent: false });

    expect(
      screen.queryByRole("button", { name: "Create Content" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bulk Delete" }),
    ).not.toBeInTheDocument();
  });
});
