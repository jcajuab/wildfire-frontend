import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { RolesPageView } from "./roles-page-client";
import { useRolesPage, type UseRolesPageResult } from "./_hooks/use-roles-page";
import { ROLE_CREATE_PATH, getRoleEditPath } from "@/lib/role-paths";

vi.mock("@/components/common/can", () => ({
  Can: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/common/confirm-action-dialog", () => ({
  ConfirmActionDialog: () => null,
}));

vi.mock("./_hooks/use-roles-page", () => ({
  PAGE_SIZE: 10,
  useRolesPage: vi.fn(),
}));

const useRolesPageMock = vi.mocked(useRolesPage);
const setPageMock = vi.fn();
const handleSearchChangeMock = vi.fn();
const handleSortChangeMock = vi.fn();
const handleEditMock = vi.fn();
const handleDeleteRoleMock = vi.fn();

function makePageResult(
  overrides: Partial<UseRolesPageResult> = {},
): UseRolesPageResult {
  return {
    canUpdateRole: true,
    canDeleteRole: true,
    search: "",
    page: 1,
    sort: { field: "name", direction: "asc" },
    roles: [
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
    rolesData: {
      items: [],
      total: 2,
      page: 1,
      pageSize: 10,
    },
    rolesLoading: false,
    rolesFetching: false,
    rolesError: false,
    roleToDelete: null,
    isDeleteDialogOpen: false,
    setPage: setPageMock,
    setRoleToDelete: vi.fn(),
    setIsDeleteDialogOpen: vi.fn(),
    handleSearchChange: handleSearchChangeMock,
    handleSortChange: handleSortChangeMock,
    handleCreate: vi.fn(),
    handleEdit: handleEditMock,
    handleDeleteRole: handleDeleteRoleMock,
    deleteRole: vi.fn(),
    ...overrides,
  };
}

describe("RolesPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRolesPageMock.mockReturnValue(makePageResult());
  });

  test("renders the cohesive roles table shell", () => {
    render(<RolesPageView />);

    expect(screen.getByRole("heading", { name: "Roles" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Search Results" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by role name or description"),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Users" })).toBeVisible();
    expect(screen.getByText("Showing 1 to 2 of 2 results")).toBeInTheDocument();
  });

  test("renders Create Role action with ROLE_CREATE_PATH target", () => {
    render(<RolesPageView />);

    expect(screen.getByRole("link", { name: "Create Role" })).toHaveAttribute(
      "href",
      ROLE_CREATE_PATH,
    );
  });

  test("updates search and sorting through page handlers", async () => {
    const actor = userEvent.setup();
    render(<RolesPageView />);

    await actor.type(
      screen.getByPlaceholderText("Search by role name or description"),
      "ops",
    );
    await actor.click(screen.getByRole("button", { name: "Users" }));

    expect(handleSearchChangeMock).toHaveBeenCalledWith("o");
    expect(handleSearchChangeMock).toHaveBeenCalledWith("p");
    expect(handleSearchChangeMock).toHaveBeenCalledWith("s");
    expect(handleSortChangeMock).toHaveBeenCalledWith({
      field: "usersCount",
      direction: "asc",
    });
  });

  test("routes edit action to getRoleEditPath(role.id)", async () => {
    const actor = userEvent.setup();

    render(<RolesPageView />);

    await actor.click(screen.getByLabelText("Actions for Operators"));
    await actor.click(screen.getByRole("menuitem", { name: "Edit Role" }));

    expect(handleEditMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "role-1" }),
    );
    expect(getRoleEditPath("role-1")).toBe("/admin/roles/edit/role-1");
  });

  test("does not show row actions for system roles", () => {
    render(<RolesPageView />);

    expect(
      screen.queryByLabelText("Actions for System Admin"),
    ).not.toBeInTheDocument();
  });

  test("renders search empty state inside the shell", () => {
    useRolesPageMock.mockReturnValueOnce(
      makePageResult({ search: "missing", roles: [] }),
    );

    render(<RolesPageView />);

    expect(screen.getByRole("heading", { name: "No roles found" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create Role" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Role" }),
    ).not.toBeInTheDocument();
  });

  test("renders roles index without any open modal", () => {
    render(<RolesPageView />);

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
