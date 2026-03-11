import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useContentPageController } from "./use-content-page-controller";
import { useCan } from "@/hooks/use-can";
import {
  useLazyGetContentJobQuery,
  useListContentQuery,
} from "@/lib/api/content-api";
import { useContentJobMonitor } from "./content-job-monitor";
import { useContentPageFilters } from "./use-content-page-filters";
import { useContentPagePdfState } from "./use-content-page-pdf";
import { useContentDialogState } from "./use-content-dialog-state";
import { useContentCrudHandlers } from "./use-content-crud-handlers";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(() => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useLazyGetContentJobQuery: vi.fn(() => [vi.fn()]),
}));

vi.mock("./content-job-monitor", () => ({
  useContentJobMonitor: vi.fn(() => ({
    trackContentJob: vi.fn(),
  })),
}));

vi.mock("./use-content-page-filters", () => ({
  useContentPageFilters: vi.fn(),
}));

vi.mock("./use-content-page-pdf", () => ({
  useContentPagePdfState: vi.fn(() => ({
    expandedPdfParentIds: [],
    pageCollectionsByParentId: new Map(),
    updatingPageId: null,
    handleTogglePdfExpand: vi.fn(),
    handleLoadMorePages: vi.fn(),
    handleRetryLoadPages: vi.fn(),
    handleTogglePageExclusion: vi.fn(),
    updatePageCollection: vi.fn(),
    setPageCollection: vi.fn(),
  })),
}));

vi.mock("./use-content-dialog-state", () => ({
  useContentDialogState: vi.fn(() => ({
    isCreateDialogOpen: false,
    setIsCreateDialogOpen: vi.fn(),
    contentToPreview: null,
    contentToEdit: null,
    contentToDelete: null,
    isDeleteDialogOpen: false,
    setIsDeleteDialogOpen: vi.fn(),
    handleEdit: vi.fn(),
    handlePreview: vi.fn(),
    handleDelete: vi.fn(),
    closeEditDialog: vi.fn(),
    closePreviewDialog: vi.fn(),
  })),
}));

vi.mock("./use-content-crud-handlers", () => ({
  useContentCrudHandlers: vi.fn(() => ({
    handleUploadFile: vi.fn(),
    handleCreateFlash: vi.fn(),
    handleCreateText: vi.fn(),
    handleDownload: vi.fn(),
    handleSaveContent: vi.fn(),
    handleConfirmDelete: vi.fn(),
  })),
}));

const useCanMock = vi.mocked(useCan);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useLazyGetContentJobQueryMock = vi.mocked(useLazyGetContentJobQuery);
const useContentJobMonitorMock = vi.mocked(useContentJobMonitor);
const useContentPageFiltersMock = vi.mocked(useContentPageFilters);
const useContentPagePdfStateMock = vi.mocked(useContentPagePdfState);
const useContentDialogStateMock = vi.mocked(useContentDialogState);
const useContentCrudHandlersMock = vi.mocked(useContentCrudHandlers);

describe("useContentPageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useLazyGetContentJobQueryMock.mockReturnValue([vi.fn()]);
    useContentJobMonitorMock.mockReturnValue({ trackContentJob: vi.fn() });
    useContentPageFiltersMock.mockReturnValue({
      statusFilter: "READY",
      typeFilter: "VIDEO",
      search: "weather",
      page: 2,
      setPage: vi.fn(),
      handleStatusFilterChange: vi.fn(),
      handleTypeFilterChange: vi.fn(),
      handleSearchChange: vi.fn(),
      handleClearFilters: vi.fn(),
    });
    useContentPagePdfStateMock.mockReturnValue({
      expandedPdfParentIds: [],
      pageCollectionsByParentId: new Map(),
      updatingPageId: null,
      handleTogglePdfExpand: vi.fn(),
      handleLoadMorePages: vi.fn(),
      handleRetryLoadPages: vi.fn(),
      handleTogglePageExclusion: vi.fn(),
      updatePageCollection: vi.fn(),
      setPageCollection: vi.fn(),
    });
    useContentDialogStateMock.mockReturnValue({
      isCreateDialogOpen: false,
      setIsCreateDialogOpen: vi.fn(),
      contentToPreview: null,
      contentToEdit: null,
      contentToDelete: null,
      isDeleteDialogOpen: false,
      setIsDeleteDialogOpen: vi.fn(),
      handleEdit: vi.fn(),
      handlePreview: vi.fn(),
      handleDelete: vi.fn(),
      closeEditDialog: vi.fn(),
      closePreviewDialog: vi.fn(),
    });
    useContentCrudHandlersMock.mockReturnValue({
      handleUploadFile: vi.fn(),
      handleCreateFlash: vi.fn(),
      handleCreateText: vi.fn(),
      handleDownload: vi.fn(),
      handleSaveContent: vi.fn(),
      handleConfirmDelete: vi.fn(),
    });
  });

  test("uses fixed recent sorting and exposes filters without sort state", () => {
    const { result } = renderHook(() => useContentPageController());

    expect(useListContentQueryMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      status: "READY",
      type: "VIDEO",
      search: "weather",
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    expect("sortBy" in result.current.filters).toBe(false);
    expect("handleSortChange" in result.current.filters).toBe(false);
  });
});
