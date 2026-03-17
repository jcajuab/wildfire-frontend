import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useRouter } from "next/navigation";

import { useCan } from "@/hooks/use-can";
import { useDeleteRoleMutation, useGetRolesQuery } from "@/lib/api/rbac-api";
import { ROLE_CREATE_PATH, getRoleEditPath } from "@/lib/role-paths";
import { useRolesFilters } from "./_hooks/use-roles-filters";
import RolesPage from "./page";

const pushMock = vi.fn();
const setPageMock = vi.fn();
const deleteRoleMutationMock = vi.fn();
const handleSearchChangeMock = vi.fn();
const handleSortChangeMock = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: vi.fn(),
  };
});

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/lib/api/rbac-api", () => ({
  useGetRolesQuery: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}));

vi.mock("./_hooks/use-roles-filters", () => ({
  useRolesFilters: vi.fn(),
}));

const useRouterMock = vi.mocked(useRouter);
const useCanMock = vi.mocked(useCan);
const useGetRolesQueryMock = vi.mocked(useGetRolesQuery);
const useDeleteRoleMutationMock = vi.mocked(useDeleteRoleMutation);
const useRolesFiltersMock = vi.mocked(useRolesFilters);

describe("RolesPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );

    vi.clearAllMocks();

    useRouterMock.mockReturnValue({
      push: pushMock,
    } as ReturnType<typeof useRouter>);

    useCanMock.mockReturnValue(true);

    useRolesFiltersMock.mockReturnValue({
      search: "",
      page: 1,
      sort: { field: "name", direction: "asc" },
      sortField: "name",
      sortDirection: "asc",
      setPage: setPageMock,
      handleSearchChange: handleSearchChangeMock,
      handleSortChange: handleSortChangeMock,
    } as ReturnType<typeof useRolesFilters>);

    useGetRolesQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: "role-1",
            name: "Operators",
            description: "Ops role",
            isSystem: false,
            usersCount: 2,
          },
          {
            id: "role-system",
            name: "System Admin",
            description: "Managed by system",
            isSystem: true,
            usersCount: 1,
          },
        ],
        total: 2,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useGetRolesQuery>);

    deleteRoleMutationMock.mockReturnValue({
      unwrap: async () => undefined,
    });

    useDeleteRoleMutationMock.mockReturnValue([
      deleteRoleMutationMock,
    ] as unknown as ReturnType<typeof useDeleteRoleMutation>);
  });

  test("renders Create Role actions with ROLE_CREATE_PATH target", () => {
    render(<RolesPage />);

    const createLinks = screen.getAllByRole("link", { name: "Create Role" });

    expect(createLinks.length).toBeGreaterThan(0);
    expect(createLinks[0]).toHaveAttribute("href", ROLE_CREATE_PATH);
  });

  test("routes edit action to getRoleEditPath(role.id)", async () => {
    const user = userEvent.setup();

    render(<RolesPage />);

    await user.click(screen.getByLabelText("Actions for Operators"));
    await user.click(screen.getByRole("menuitem", { name: "Edit Role" }));

    expect(pushMock).toHaveBeenCalledWith(getRoleEditPath("role-1"));
  });

  test("does not show edit action for system roles", () => {
    render(<RolesPage />);

    expect(
      screen.queryByLabelText("Actions for System Admin"),
    ).not.toBeInTheDocument();
  });

  test("renders roles index as route content without any open modal", () => {
    render(<RolesPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Create Role" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Edit Role" }),
    ).not.toBeInTheDocument();
  });
});
