import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import { useListInvitationsQuery } from "@/lib/api/invitations-api";
import {
  rbacApi,
  useGetRoleOptionsQuery,
  useGetUsersQuery,
  type RbacUser,
  type RbacUserListQuery,
  type RbacUsersListResponse,
} from "@/lib/api/rbac-api";
import type { InvitationListResponse } from "@/types/invitation";

import { useUsersFilters } from "./use-users-filters";
import { useUsersPage } from "./use-users-page";

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin", name: "Admin", isAdmin: true },
  })),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/api-client", () => ({
  AuthApiError: class AuthApiError extends Error {
    status = 500;
  },
}));

vi.mock("@/lib/api/invitations-api", () => ({
  useCreateInvitationMutation: vi.fn(() => [vi.fn()]),
  useListInvitationsQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  })),
  useResendInvitationMutation: vi.fn(() => [vi.fn()]),
}));

vi.mock("@/lib/api/rbac-api", () => ({
  rbacApi: {
    endpoints: {
      getUsers: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useGetRoleOptionsQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetUsersQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useSetUserRolesMutation: vi.fn(() => [vi.fn()]),
  useSetUserStatusMutation: vi.fn(() => [vi.fn()]),
  useResetUserPasswordMutation: vi.fn(() => [vi.fn()]),
  useUpdateUserMutation: vi.fn(() => [vi.fn()]),
}));

vi.mock("./use-users-dialogs", () => ({
  useUsersDialogs: vi.fn(() => ({
    isInviteDialogOpen: false,
    isEditDialogOpen: false,
    selectedUser: null,
    userToBan: null,
    isBanDialogOpen: false,
    resetPasswordResult: null,
    isResetPasswordDialogOpen: false,
    setIsInviteDialogOpen: vi.fn(),
    setIsEditDialogOpen: vi.fn(),
    setSelectedUser: vi.fn(),
    setIsBanDialogOpen: vi.fn(),
    setUserToBan: vi.fn(),
    setResetPasswordResult: vi.fn(),
    setIsResetPasswordDialogOpen: vi.fn(),
    handleEdit: vi.fn(),
    handleRequestBanUser: vi.fn(),
    handleRequestUnbanUser: vi.fn(),
  })),
}));

vi.mock("./use-users-filters", () => ({
  useUsersFilters: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const useCanMock = vi.mocked(useCan);
const useListInvitationsQueryMock = vi.mocked(useListInvitationsQuery);
const useGetRoleOptionsQueryMock = vi.mocked(useGetRoleOptionsQuery);
const useGetUsersQueryMock = vi.mocked(useGetUsersQuery);
const useGetUsersQueryStateMock = vi.mocked(
  rbacApi.endpoints.getUsers.useQueryState,
);
const useUsersFiltersMock = vi.mocked(useUsersFilters);

const initialUsersQuery: RbacUserListQuery = {
  page: 1,
  pageSize: 30,
  sortBy: "name",
  sortDirection: "asc",
};

function makeUsersData(names: readonly string[]): RbacUsersListResponse {
  return {
    items: names.map(
      (name, index): RbacUser => ({
        id: `user-${index + 1}`,
        username: name.toLowerCase(),
        email: null,
        name,
        isActive: true,
        isInvitedUser: false,
        bannedAt: null,
        lastSeenAt: null,
        avatarUrl: null,
        roles: [],
      }),
    ),
    total: names.length,
    page: 1,
    pageSize: 30,
  };
}

function makeInvitationsData(
  status: "pending" | "expired",
): InvitationListResponse {
  return {
    items: [
      {
        id: `invite-${status}`,
        email: `${status}@example.com`,
        name: null,
        status,
        expiresAt: "2026-05-08T00:00:00.000Z",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 30,
  };
}

function mockFilters(overrides: Partial<ReturnType<typeof useUsersFilters>>) {
  useUsersFiltersMock.mockReturnValue({
    search: "",
    roleId: "all",
    page: 1,
    invitationSearch: "",
    invitationPage: 1,
    invitationStatusFilter: "all",
    activeTab: "users",
    setPage: vi.fn(),
    setInvitationPage: vi.fn(),
    setActiveTab: vi.fn(),
    sort: { field: "name", direction: "asc" },
    invitationSort: { field: "createdAt", direction: "desc" },
    sortField: "name",
    sortDirection: "asc",
    handleSearchChange: vi.fn(),
    handleSortChange: vi.fn(),
    handleRoleFilterChange: vi.fn(),
    handleInvitationSearchChange: vi.fn(),
    handleInvitationStatusFilterChange: vi.fn(),
    handleInvitationSortChange: vi.fn(),
    ...overrides,
  });
}

describe("useUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthMock.mockReturnValue({
      user: { id: "admin", name: "Admin", isAdmin: true },
      status: "authenticated",
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    useCanMock.mockImplementation(
      (permission) => permission !== "users:create",
    );
    mockFilters({});
    useGetRoleOptionsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetRoleOptionsQuery>);
    useGetUsersQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetUsersQuery>);
    useGetUsersQueryStateMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<
      typeof rbacApi.endpoints.getUsers.useQueryState
    >);
    useListInvitationsQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useListInvitationsQuery>);
  });

  test("uses initial users when returning to the default name sort", () => {
    mockFilters({
      sort: { field: "name", direction: "asc" },
      sortField: "name",
      sortDirection: "asc",
    });
    useGetUsersQueryMock.mockReturnValue({
      data: makeUsersData(["Bob", "Alice", "Admin"]),
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetUsersQuery>);

    const { result } = renderHook(() =>
      useUsersPage({
        initialUsers: {
          queryArgs: initialUsersQuery,
          data: makeUsersData(["Admin", "Alice", "Bob"]),
        },
      }),
    );

    expect(useGetUsersQueryMock).toHaveBeenCalledWith(initialUsersQuery, {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: true,
    });
    expect(result.current.users.map((user) => user.name)).toEqual([
      "Admin",
      "Alice",
      "Bob",
    ]);
  });

  test("refetches invitations when invitation filters differ from initial data", async () => {
    useCanMock.mockReturnValue(true);
    mockFilters({
      activeTab: "invitations",
      invitationStatusFilter: "pending",
    });

    const { result } = renderHook(() =>
      useUsersPage({
        initialInvitations: makeInvitationsData("expired"),
      }),
    );

    expect(useListInvitationsQueryMock).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 30,
        q: undefined,
        status: "pending",
        sortBy: "createdAt",
        sortDirection: "desc",
      },
      {
        skip: false,
        refetchOnFocus: false,
        refetchOnReconnect: false,
      },
    );
    expect(result.current.invitations).toEqual([]);

    useListInvitationsQueryMock.mockReturnValue({
      data: makeInvitationsData("pending"),
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useListInvitationsQuery>);

    const { result: nextResult } = renderHook(() =>
      useUsersPage({
        initialInvitations: makeInvitationsData("expired"),
      }),
    );
    expect(nextResult.current.invitations[0]?.status).toBe("pending");
  });
});
