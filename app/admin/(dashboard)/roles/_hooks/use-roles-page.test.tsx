import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useCan } from "@/hooks/use-can";
import {
  rbacApi,
  useDeleteRoleMutation,
  useGetRolesQuery,
  type RbacRoleListQuery,
  type RbacRolesListResponse,
} from "@/lib/api/rbac-api";

import { useRolesFilters } from "./use-roles-filters";
import { useRolesPage } from "./use-roles-page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/api/rbac-api", () => ({
  rbacApi: {
    endpoints: {
      getRoles: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useDeleteRoleMutation: vi.fn(() => [vi.fn()]),
  useGetRolesQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
  })),
}));

vi.mock("./use-roles-filters", () => ({
  useRolesFilters: vi.fn(),
}));

const useCanMock = vi.mocked(useCan);
const useDeleteRoleMutationMock = vi.mocked(useDeleteRoleMutation);
const useGetRolesQueryMock = vi.mocked(useGetRolesQuery);
const useGetRolesQueryStateMock = vi.mocked(
  rbacApi.endpoints.getRoles.useQueryState,
);
const useRolesFiltersMock = vi.mocked(useRolesFilters);

const initialQuery: RbacRoleListQuery = {
  page: 1,
  pageSize: 30,
  sortBy: "name",
  sortDirection: "asc",
};

const descendingQuery: RbacRoleListQuery = {
  ...initialQuery,
  sortDirection: "desc",
};

function makeRolesData(names: readonly string[]): RbacRolesListResponse {
  return {
    items: names.map((name, index) => ({
      id: `role-${index + 1}`,
      name,
      description: `${name} description`,
      isSystem: name === "Admin",
      usersCount: index,
    })),
    total: names.length,
    page: 1,
    pageSize: 30,
  };
}

const ascendingRoles = makeRolesData(["Admin", "Editor", "Viewer"]);
const descendingRoles = makeRolesData(["Viewer", "Editor", "Admin"]);

function mockFilters(sortDirection: "asc" | "desc") {
  useRolesFiltersMock.mockReturnValue({
    search: "",
    page: 1,
    setPage: vi.fn(),
    sort: { field: "name", direction: sortDirection },
    sortField: "name",
    sortDirection,
    handleSearchChange: vi.fn(),
    handleSortChange: vi.fn(),
  });
}

describe("useRolesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    useDeleteRoleMutationMock.mockReturnValue([
      vi.fn(),
    ] as unknown as ReturnType<typeof useDeleteRoleMutation>);
    useGetRolesQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetRolesQuery>);
    useGetRolesQueryStateMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<
      typeof rbacApi.endpoints.getRoles.useQueryState
    >);
  });

  test("uses the initial list when returning to the default name sort", () => {
    mockFilters("asc");
    useGetRolesQueryMock.mockReturnValue({
      data: descendingRoles,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetRolesQuery>);

    const { result } = renderHook(() =>
      useRolesPage({
        initialList: {
          queryArgs: initialQuery,
          data: ascendingRoles,
        },
      }),
    );

    expect(useGetRolesQueryMock).toHaveBeenCalledWith(initialQuery, {
      skip: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });
    expect(result.current.roles.map((role) => role.name)).toEqual([
      "Admin",
      "Editor",
      "Viewer",
    ]);
  });

  test("uses active query data for non-initial name sorts", () => {
    mockFilters("desc");
    useGetRolesQueryMock.mockReturnValue({
      data: descendingRoles,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetRolesQuery>);

    const { result } = renderHook(() =>
      useRolesPage({
        initialList: {
          queryArgs: initialQuery,
          data: ascendingRoles,
        },
      }),
    );

    expect(useGetRolesQueryMock).toHaveBeenCalledWith(descendingQuery, {
      skip: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });
    expect(result.current.roles.map((role) => role.name)).toEqual([
      "Viewer",
      "Editor",
      "Admin",
    ]);
  });
});
