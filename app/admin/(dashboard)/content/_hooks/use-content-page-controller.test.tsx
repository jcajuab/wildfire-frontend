import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useContentPageController } from "./use-content-page-controller";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/context/auth-context";
import {
  contentApi,
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
  useListContentQuery,
  useUploadPdfMutation,
  useSubmitPdfCropsMutation,
  useCancelPdfUploadMutation,
} from "@/lib/api/content-api";
import { useGetUserOptionsQuery, useGetUserQuery } from "@/lib/api/rbac-api";
import type {
  BackendContentListItem,
  BackendContentListResponse,
  ContentListQuery,
} from "@/lib/api/content-api";
import { useContentJobMonitor } from "./content-job-monitor";
import { useContentPageFilters } from "./use-content-page-filters";
import { useContentDialogState } from "./use-content-dialog-state";
import { useContentCrudHandlers } from "./use-content-crud-handlers";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-id", username: "admin", isAdmin: true },
  })),
}));

vi.mock("@/lib/api/content-api", () => ({
  contentApi: {
    endpoints: {
      listContent: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useListContentQuery: vi.fn(() => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  })),
  useLazyGetContentJobQuery: vi.fn(() => [vi.fn()]),
  useLazyGetContentQuery: vi.fn(() => [vi.fn()]),
  useUploadPdfMutation: vi.fn(() => [vi.fn()]),
  useSubmitPdfCropsMutation: vi.fn(() => [vi.fn()]),
  useCancelPdfUploadMutation: vi.fn(() => [vi.fn()]),
}));

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(() => ({
    data: [],
  })),
  useGetUserQuery: vi.fn(() => ({
    data: undefined,
  })),
}));

vi.mock("./content-job-monitor", () => ({
  useContentJobMonitor: vi.fn(() => ({
    trackContentJob: vi.fn(),
  })),
}));

vi.mock("./use-content-page-filters", () => ({
  useContentPageFilters: vi.fn(),
}));

vi.mock("./use-content-dialog-state", () => ({
  useContentDialogState: vi.fn(() => ({
    isCreateDialogOpen: false,
    setIsCreateDialogOpen: vi.fn(),
    createMode: null,
    openCreateDialog: vi.fn(),
    contentToEdit: null,
    contentToDelete: null,
    isDeleteDialogOpen: false,
    setIsDeleteDialogOpen: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    closeEditDialog: vi.fn(),
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
const useAuthMock = vi.mocked(useAuth);
const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);
const useGetUserQueryMock = vi.mocked(useGetUserQuery);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useLazyGetContentJobQueryMock = vi.mocked(useLazyGetContentJobQuery);
const useLazyGetContentQueryMock = vi.mocked(useLazyGetContentQuery);
const useUploadPdfMutationMock = vi.mocked(useUploadPdfMutation);
const useSubmitPdfCropsMutationMock = vi.mocked(useSubmitPdfCropsMutation);
const useCancelPdfUploadMutationMock = vi.mocked(useCancelPdfUploadMutation);
const useContentJobMonitorMock = vi.mocked(useContentJobMonitor);
const useContentPageFiltersMock = vi.mocked(useContentPageFilters);
const useContentDialogStateMock = vi.mocked(useContentDialogState);
const useContentCrudHandlersMock = vi.mocked(useContentCrudHandlers);
const useListContentQueryStateMock = vi.mocked(
  contentApi.endpoints.listContent.useQueryState,
);

function makeContentData(
  titles: readonly string[],
): BackendContentListResponse {
  return {
    items: titles.map(
      (title, index): BackendContentListItem => ({
        id: `content-${index + 1}`,
        title,
        type: "TEXT",
        status: "READY",
        thumbnailUrl: undefined,
        mimeType: "text/html",
        fileSize: 100,
        checksum: `checksum-${index + 1}`,
        width: null,
        height: null,
        duration: null,
        flashMessage: null,
        flashTone: null,
        textHtmlContent: `<p><strong>${title}</strong></p>`,
        textPreviewText: title,
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
        owner: {
          id: "user-1",
          username: "admin",
          name: "Admin",
        },
      }),
    ),
    total: titles.length,
    page: 1,
    pageSize: 20,
  };
}

describe("useContentPageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({
      user: {
        id: "admin-id",
        username: "admin",
        email: null,
        name: "Admin",
        isAdmin: true,
        isInvitedUser: false,
        timezone: null,
        avatarUrl: null,
      },
      permissions: [],
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      can: vi.fn(() => true),
      login: vi.fn(),
      logout: vi.fn(),
      bootstrapSession: vi.fn(),
      updateSession: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          username: "admin",
          email: null,
          name: "Admin",
          isActive: true,
        },
      ],
      isFetching: false,
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);
    useGetUserQueryMock.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useGetUserQuery>);
    useLazyGetContentJobQueryMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useLazyGetContentJobQuery>);
    useLazyGetContentQueryMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useLazyGetContentQuery>);
    useUploadPdfMutationMock.mockReturnValue([vi.fn()] as unknown as ReturnType<
      typeof useUploadPdfMutation
    >);
    useSubmitPdfCropsMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useSubmitPdfCropsMutation>);
    useCancelPdfUploadMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useCancelPdfUploadMutation>);
    useContentJobMonitorMock.mockReturnValue({ trackContentJob: vi.fn() });
    useContentPageFiltersMock.mockReturnValue({
      statusFilter: "READY",
      typeFilter: "VIDEO",
      ownerFilter: "00000000-0000-4000-8000-000000000001",
      sortFilter: "title-asc",
      search: "weather",
      page: 2,
      setPage: vi.fn(),
      handleStatusFilterChange: vi.fn(),
      handleTypeFilterChange: vi.fn(),
      handleOwnerFilterChange: vi.fn(),
      handleSortFilterChange: vi.fn(),
      handleSearchChange: vi.fn(),
      handleClearFilters: vi.fn(),
    });
    useContentDialogStateMock.mockReturnValue({
      isCreateDialogOpen: false,
      setIsCreateDialogOpen: vi.fn(),
      createMode: null,
      openCreateDialog: vi.fn(),
      contentToEdit: null,
      contentToDelete: null,
      isDeleteDialogOpen: false,
      setIsDeleteDialogOpen: vi.fn(),
      handleEdit: vi.fn(),
      handleDelete: vi.fn(),
      closeEditDialog: vi.fn(),
    });
    useContentCrudHandlersMock.mockReturnValue({
      handleUploadFile: vi.fn(),
      handleCreateFlash: vi.fn(),
      handleCreateText: vi.fn(),
      handleDownload: vi.fn(),
      handleSaveContent: vi.fn(),
      handleConfirmDelete: vi.fn(),
      deleteContentById: vi.fn(),
    });
  });

  test("uses selected sort and owner filter in content queries", () => {
    const { result } = renderHook(() => useContentPageController());

    expect(useListContentQueryMock).toHaveBeenCalledWith(
      {
        page: 2,
        pageSize: 20,
        status: "READY",
        type: "VIDEO",
        ownerId: "00000000-0000-4000-8000-000000000001",
        search: "weather",
        sortBy: "title",
        sortDirection: "asc",
      },
      {
        pollingInterval: 300_000,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
      },
    );
    expect(result.current.canCreateContent).toBe(true);
    expect(result.current.canFilterByOwner).toBe(true);
    expect(result.current.ownerOptions).toHaveLength(1);
    expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
      { q: undefined, limit: 25 },
      { skip: false },
    );
  });

  test("uses initial content data when returning to the initial query", () => {
    const initialQuery: ContentListQuery = {
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortDirection: "desc",
    };
    const initialData = makeContentData(["Announcement"]);
    const staleFilteredData = makeContentData(["Weather Alert"]);

    useContentPageFiltersMock.mockReturnValue({
      statusFilter: "all",
      typeFilter: "all",
      ownerFilter: "all",
      sortFilter: "newest",
      search: "",
      page: 1,
      setPage: vi.fn(),
      handleStatusFilterChange: vi.fn(),
      handleTypeFilterChange: vi.fn(),
      handleOwnerFilterChange: vi.fn(),
      handleSortFilterChange: vi.fn(),
      handleSearchChange: vi.fn(),
      handleClearFilters: vi.fn(),
    });
    useListContentQueryMock.mockReturnValue({
      data: staleFilteredData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useListContentQuery>);

    const { result } = renderHook(() =>
      useContentPageController({
        initialList: {
          queryArgs: initialQuery,
          data: initialData,
          isSeeded: true,
        },
      }),
    );

    expect(useListContentQueryMock).toHaveBeenCalledWith(
      {
        ...initialQuery,
        search: undefined,
        status: undefined,
        type: undefined,
      },
      {
        pollingInterval: 300_000,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
      },
    );
    expect(result.current.visibleContents.map((item) => item.title)).toEqual([
      "Announcement",
    ]);
  });

  test("uses active content query data for changed filters", () => {
    const filteredData = makeContentData(["Weather Alert"]);

    useListContentQueryMock.mockReturnValue({
      data: filteredData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useListContentQuery>);
    useListContentQueryStateMock.mockReturnValue({
      data: makeContentData(["Announcement"]),
      isFetching: false,
    });

    const { result } = renderHook(() =>
      useContentPageController({
        initialList: {
          queryArgs: {
            page: 1,
            pageSize: 20,
            sortBy: "createdAt",
            sortDirection: "desc",
          },
          data: makeContentData(["Announcement"]),
          isSeeded: true,
        },
      }),
    );

    expect(result.current.visibleContents.map((item) => item.title)).toEqual([
      "Weather Alert",
    ]);
  });
});
