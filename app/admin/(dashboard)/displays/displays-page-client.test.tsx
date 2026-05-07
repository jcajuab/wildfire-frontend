import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DisplaysPageView } from "./displays-page-client";
import {
  PAGE_SIZE,
  useDisplaysPage,
  type UseDisplaysPageResult,
} from "./_hooks/use-displays-page";
import type { Display } from "@/types/display";

vi.mock("@/components/common/can", () => ({
  Can: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/displays/display-registration-link-dialog", () => ({
  DisplayRegistrationLinkDialog: () => null,
}));

vi.mock("@/components/displays/display-group-manager-dialog", () => ({
  DisplayGroupManagerDialog: () => null,
}));

vi.mock("@/components/displays/edit-display-dialog", () => ({
  EditDisplayDialog: () => null,
}));

vi.mock("@/components/common/confirm-action-dialog", () => ({
  ConfirmActionDialog: () => null,
}));

vi.mock("@/components/common/bulk-delete-confirm-dialog", () => ({
  BulkDeleteConfirmDialog: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/displays/displays-toolbar", () => ({
  DisplaysToolbar: () => (
    <header className="shrink-0 border-b border-border bg-background p-4">
      <h1>Displays</h1>
    </header>
  ),
}));

vi.mock("@/components/displays/display-grid", () => ({
  DisplayGrid: ({
    items,
    showOutputMetadata,
  }: {
    readonly items: readonly Display[];
    readonly showOutputMetadata?: boolean;
  }) => (
    <div
      data-testid="display-grid"
      data-show-output-metadata={showOutputMetadata ? "true" : "false"}
    >
      {items.map((item) => (
        <article key={item.id}>{item.name}</article>
      ))}
    </div>
  ),
}));

vi.mock("./_hooks/use-displays-page", () => ({
  PAGE_SIZE: 20,
  useDisplaysPage: vi.fn(),
}));

const useDisplaysPageMock = vi.mocked(useDisplaysPage);
const setPageMock = vi.fn();

const display: Display = {
  id: "display-1",
  slug: "display-1",
  name: "Lobby Display",
  status: "READY",
  output: "HDMI",
  groups: [],
  createdAt: "2025-01-01T00:00:00.000Z",
};

function makePageResult(
  overrides: Partial<UseDisplaysPageResult> = {},
): UseDisplaysPageResult {
  return {
    canReadDisplays: true,
    canCreateDisplay: true,
    canManageDisplayGroups: true,
    canUpdateDisplay: true,
    canDeleteDisplay: true,
    statusFilter: "all",
    search: "",
    page: 1,
    groupFilters: [],
    normalizedOutputFilter: "all",
    availableGroupFilters: [],
    availableOutputFilters: [],
    displays: [display],
    displaysData: {
      items: [],
      total: PAGE_SIZE + 5,
      page: 1,
      pageSize: PAGE_SIZE,
    },
    displayGroupsData: [],
    globalEmergencyActive: false,
    isLoading: false,
    isFetching: false,
    isError: false,
    loadErrorMessage: "Failed to load displays.",
    isAddInfoDialogOpen: false,
    isEditDialogOpen: false,
    isUnregisterDialogOpen: false,
    selectedDisplay: null,
    displayToUnregister: null,
    setIsAddInfoDialogOpen: vi.fn(),
    setPage: setPageMock,
    refetch: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handleSearchChange: vi.fn(),
    handleGroupFilterChange: vi.fn(),
    handleOutputFilterChange: vi.fn(),
    handleClearFilters: vi.fn(),
    handleViewPage: vi.fn(),
    handleUnregisterDisplay: vi.fn(),
    handleUnregisterDialogOpenChange: vi.fn(),
    handleConfirmUnregisterDisplay: vi.fn(),
    unregisterDisplayById: vi.fn(),
    handleEditDisplay: vi.fn(),
    handleSaveDisplay: vi.fn(),
    handleEditDialogOpenChange: vi.fn(),
    ...overrides,
  };
}

describe("DisplaysPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDisplaysPageMock.mockReturnValue(makePageResult());
  });

  test("uses one consistent content padding around the display grid", () => {
    render(<DisplaysPageView />);

    const contentRegion = screen.getByTestId("display-grid").parentElement;

    expect(contentRegion).toHaveClass("p-4");
    expect(contentRegion).not.toHaveClass("p-6");
    expect(contentRegion).not.toHaveClass("px-6");
    expect(contentRegion).not.toHaveClass("py-6");
    expect(contentRegion).not.toHaveClass("sm:px-8");
    expect(contentRegion).not.toHaveClass("sm:py-8");
  });

  test("renders shared pagination when displays exceed one page", async () => {
    const user = userEvent.setup();
    render(<DisplaysPageView />);

    expect(
      screen.getByText(`Showing 1 to ${PAGE_SIZE} of ${PAGE_SIZE + 5} results`),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Go to next page" }));

    expect(setPageMock).toHaveBeenCalledWith(2);
  });

  test("keeps pagination visible when all displays fit on one page", () => {
    useDisplaysPageMock.mockReturnValue(
      makePageResult({
        displaysData: {
          items: [],
          total: PAGE_SIZE,
          page: 1,
          pageSize: PAGE_SIZE,
        },
      }),
    );

    render(<DisplaysPageView />);

    expect(
      screen.getByText(`Showing 1 to ${PAGE_SIZE} of ${PAGE_SIZE} results`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("keeps pagination visible for empty display results", () => {
    useDisplaysPageMock.mockReturnValue(
      makePageResult({
        displays: [],
        displaysData: {
          items: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
        },
      }),
    );

    render(<DisplaysPageView />);

    expect(screen.getByText("Showing 0 to 0 of 0 results")).toBeInTheDocument();
  });

  test("renders load errors inside the same content padding", () => {
    useDisplaysPageMock.mockReturnValue(
      makePageResult({
        isError: true,
        displays: [],
        displaysData: {
          items: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
        },
        loadErrorMessage: "Displays could not load.",
      }),
    );

    render(<DisplaysPageView />);

    const error = screen.getByText("Displays could not load.");

    expect(error.parentElement).toHaveClass("p-4");
  });

  test("shows display output metadata for users who can create displays", () => {
    render(<DisplaysPageView />);

    expect(screen.getByTestId("display-grid")).toHaveAttribute(
      "data-show-output-metadata",
      "true",
    );
  });

  test("hides display output metadata for users without create permission", () => {
    useDisplaysPageMock.mockReturnValue(
      makePageResult({ canCreateDisplay: false }),
    );

    render(<DisplaysPageView />);

    expect(screen.getByTestId("display-grid")).toHaveAttribute(
      "data-show-output-metadata",
      "false",
    );
  });
});
