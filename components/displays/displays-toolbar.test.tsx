import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { DisplaysToolbar } from "@/components/displays/displays-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const baseProps = {
  statusFilter: "all" as const,
  search: "",
  selectedGroups: [],
  selectedOutput: "all",
  filteredResultsCount: 8,
  availableGroups: ["Lobby", "Hallway"],
  availableOutputs: ["HDMI", "DisplayPort"],
  canCreateDisplay: true,
  canManageGroups: true,
  canDeleteDisplay: true,
  bulkState: {
    mode: "normal" as const,
    onEnterBulkUnregister: vi.fn(),
  },
  onStatusFilterChange: vi.fn(),
  onSearchChange: vi.fn(),
  onGroupFilterChange: vi.fn(),
  onOutputFilterChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRegisterDisplay: vi.fn(),
  onManageGroups: vi.fn(),
};

function renderToolbar(props: Partial<typeof baseProps> = {}) {
  const mergedProps = {
    ...baseProps,
    ...props,
  };

  return render(
    <TooltipProvider>
      <DisplaysToolbar {...mergedProps} />
    </TooltipProvider>,
  );
}

describe("DisplaysToolbar", () => {
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

  test("renders one page heading with centered search, filter, and actions controls", () => {
    renderToolbar();

    expect(screen.getAllByRole("heading", { name: "Displays" })).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("button", { name: "Bulk Unregister" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage Displays" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search displays" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by display name or slug"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter displays" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("textbox", { name: "Search displays" })
        .compareDocumentPosition(
          screen.getByRole("button", { name: "Filter displays" }),
        ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.queryByRole("button", { name: "Actions" }),
    ).not.toBeInTheDocument();
  });

  test("renders the manage displays dropdown when any manage permission exists", () => {
    renderToolbar({ canCreateDisplay: false, canManageGroups: true });

    expect(
      screen.getByRole("button", { name: "Manage Displays" }),
    ).toBeInTheDocument();
  });

  test("routes manage displays menu items to the display and group dialogs", async () => {
    const user = userEvent.setup();
    const onRegisterDisplay = vi.fn();
    const onManageGroups = vi.fn();
    renderToolbar({ onRegisterDisplay, onManageGroups });

    await user.click(screen.getByRole("button", { name: "Manage Displays" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Register Display" }),
    );
    expect(onRegisterDisplay).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Manage Displays" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Edit Display Groups" }),
    );
    expect(onManageGroups).toHaveBeenCalledTimes(1);
  });

  test("enters bulk unregister mode from the toolbar button", async () => {
    const user = userEvent.setup();
    const onEnterBulkUnregister = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "normal",
        onEnterBulkUnregister,
      },
    });

    const bulkButton = screen.getByRole("button", {
      name: "Bulk Unregister",
    });

    expect(bulkButton).toHaveAttribute("data-variant", "outline");
    expect(bulkButton).toHaveAttribute("data-size", "default");
    expect(bulkButton).toHaveClass("text-destructive");

    await user.click(bulkButton);

    expect(onEnterBulkUnregister).toHaveBeenCalledTimes(1);
  });

  test("keeps heading, search, filter, and actions visible while showing bulk action strip", async () => {
    const user = userEvent.setup();
    const onBulkDelete = vi.fn();
    const onCancel = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "bulk-unregister",
        selectedCount: 2,
        onDelete: onBulkDelete,
        onCancel,
      },
    });

    expect(screen.getAllByRole("heading", { name: "Displays" })).toHaveLength(
      1,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search displays" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter displays" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage Displays" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bulk Unregister" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unregister 2 displays" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unregister Selected" }),
    ).toHaveAttribute("data-variant", "destructive");
    expect(
      screen.getByRole("button", { name: "Unregister Selected" }),
    ).toHaveAttribute("data-size", "default");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "data-size",
      "default",
    );

    await user.click(
      screen.getByRole("button", { name: "Unregister Selected" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onBulkDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("hides bulk unregister while bulk mode is active", async () => {
    const user = userEvent.setup();
    renderToolbar({
      bulkState: {
        mode: "bulk-unregister",
        selectedCount: 1,
        onDelete: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    await user.click(screen.getByRole("button", { name: "Manage Displays" }));

    expect(
      screen.queryByRole("menuitem", { name: "Bulk Unregister" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Register Display" }),
    ).toBeInTheDocument();
  });

  test("disables unregister selected when no displays are selected", () => {
    renderToolbar({
      bulkState: {
        mode: "bulk-unregister",
        selectedCount: 0,
        onDelete: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unregister Selected" }),
    ).toBeDisabled();
  });

  test("hides unavailable add and select actions", () => {
    renderToolbar({
      canCreateDisplay: false,
      canManageGroups: false,
      canDeleteDisplay: false,
    });

    expect(
      screen.queryByRole("button", { name: "Manage Displays" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bulk Unregister" }),
    ).not.toBeInTheDocument();
  });

  test("can show bulk unregister without manage display actions", () => {
    renderToolbar({
      canCreateDisplay: false,
      canManageGroups: false,
      canDeleteDisplay: true,
    });

    expect(
      screen.queryByRole("button", { name: "Manage Displays" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bulk Unregister" }),
    ).toBeInTheDocument();
  });

  test("register menu items respect create and manage permissions", async () => {
    const user = userEvent.setup();
    renderToolbar({ canCreateDisplay: false, canManageGroups: true });

    await user.click(screen.getByRole("button", { name: "Manage Displays" }));

    expect(
      screen.queryByRole("menuitem", { name: "Register Display" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Edit Display Groups" }),
    ).toBeInTheDocument();
  });
});
