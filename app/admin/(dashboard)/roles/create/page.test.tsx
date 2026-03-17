import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useRouter } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetUserOptionsQuery,
  useLazyGetUserRolesQuery,
  useSetRolePermissionsMutation,
  useSetUserRolesMutation,
  useUpdateRoleMutation,
} from "@/lib/api/rbac-api";
import { ROLE_INDEX_PATH } from "@/lib/role-paths";
import CreateRolePage from "./page";

function findAncestorWithClasses(
  element: HTMLElement,
  classNames: string[],
): HTMLElement | null {
  let current = element.parentElement;

  while (current) {
    if (
      classNames.every((className) => current.classList.contains(className))
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

const pushMock = vi.fn();
const createRoleMock = vi.fn();
const setRolePermissionsMock = vi.fn();
const setUserRolesMock = vi.fn();
const getUserRolesTriggerMock = vi.fn();
const updateRoleMock = vi.fn();
const deleteRoleMutationMock = vi.fn();

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
  useGetPermissionsQuery: vi.fn(),
  useGetUserOptionsQuery: vi.fn(),
  useCreateRoleMutation: vi.fn(),
  useUpdateRoleMutation: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
  useSetRolePermissionsMutation: vi.fn(),
  useSetUserRolesMutation: vi.fn(),
  useLazyGetUserRolesQuery: vi.fn(),
}));

const useRouterMock = vi.mocked(useRouter);
const useCanMock = vi.mocked(useCan);
const useGetPermissionsQueryMock = vi.mocked(useGetPermissionsQuery);
const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);
const useCreateRoleMutationMock = vi.mocked(useCreateRoleMutation);
const useUpdateRoleMutationMock = vi.mocked(useUpdateRoleMutation);
const useDeleteRoleMutationMock = vi.mocked(useDeleteRoleMutation);
const useSetRolePermissionsMutationMock = vi.mocked(
  useSetRolePermissionsMutation,
);
const useSetUserRolesMutationMock = vi.mocked(useSetUserRolesMutation);
const useLazyGetUserRolesQueryMock = vi.mocked(useLazyGetUserRolesQuery);

describe("CreateRolePage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );

    vi.resetAllMocks();

    useRouterMock.mockReturnValue({
      push: pushMock,
    } as ReturnType<typeof useRouter>);

    useCanMock.mockImplementation((permission) => permission !== "users:read");

    useGetPermissionsQueryMock.mockReturnValue({
      data: [
        {
          id: "perm-1",
          resource: "roles",
          action: "read",
        },
      ],
    } as ReturnType<typeof useGetPermissionsQuery>);

    useGetUserOptionsQueryMock.mockReturnValue({
      data: [],
    } as ReturnType<typeof useGetUserOptionsQuery>);

    createRoleMock.mockReturnValue({
      unwrap: async () => ({
        id: "role-1",
        name: "Moderators",
        description: null,
        isSystem: false,
      }),
    });
    setRolePermissionsMock.mockReturnValue({
      unwrap: async () => [],
    });
    setUserRolesMock.mockReturnValue({
      unwrap: async () => [],
    });
    updateRoleMock.mockReturnValue({
      unwrap: async () => [],
    });
    deleteRoleMutationMock.mockReturnValue({
      unwrap: async () => undefined,
    });
    getUserRolesTriggerMock.mockReturnValue({
      unwrap: async () => [],
    });

    useCreateRoleMutationMock.mockReturnValue([
      createRoleMock,
    ] as unknown as ReturnType<typeof useCreateRoleMutation>);
    useUpdateRoleMutationMock.mockReturnValue([
      updateRoleMock,
    ] as unknown as ReturnType<typeof useUpdateRoleMutation>);
    useDeleteRoleMutationMock.mockReturnValue([
      deleteRoleMutationMock,
    ] as unknown as ReturnType<typeof useDeleteRoleMutation>);
    useSetRolePermissionsMutationMock.mockReturnValue([
      setRolePermissionsMock,
    ] as unknown as ReturnType<typeof useSetRolePermissionsMutation>);
    useSetUserRolesMutationMock.mockReturnValue([
      setUserRolesMock,
    ] as unknown as ReturnType<typeof useSetUserRolesMutation>);
    useLazyGetUserRolesQueryMock.mockReturnValue([
      getUserRolesTriggerMock,
    ] as unknown as ReturnType<typeof useLazyGetUserRolesQuery>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders create role page title and header actions", () => {
    render(<CreateRolePage />);

    expect(
      screen.getByRole("heading", { name: "Create Role" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Create" })).toHaveLength(1);
  });

  test("keeps DashboardPage.Content as the shell and uses an inner scroll wrapper", () => {
    render(<CreateRolePage />);

    const roleNameInput = screen.getByLabelText("Role Name");
    const scrollWrapper = findAncestorWithClasses(roleNameInput, [
      "min-h-0",
      "flex-1",
      "overflow-auto",
      "overscroll-none",
      "px-6",
      "py-6",
      "sm:px-8",
      "sm:py-8",
    ]);

    expect(scrollWrapper).not.toBeNull();
    expect(scrollWrapper?.classList.contains("overflow-y-auto")).toBe(false);

    const contentShell = findAncestorWithClasses(roleNameInput, [
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-hidden",
    ]);

    expect(contentShell).not.toBeNull();
    expect(contentShell?.classList.contains("overflow-y-auto")).toBe(false);
    expect(contentShell).toContainElement(scrollWrapper);
  });

  test("navigates back to roles index on cancel", async () => {
    const user = userEvent.setup();

    render(<CreateRolePage />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(pushMock).toHaveBeenCalledWith(ROLE_INDEX_PATH);
  });

  test("creates a role when users:read is unavailable", async () => {
    const user = userEvent.setup();

    render(<CreateRolePage />);

    expect(
      screen.getByText("User assignment is unavailable without `users:read`."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Role Name"), "Moderators");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createRoleMock).toHaveBeenCalledWith({
        name: "Moderators",
        description: null,
      });
    });

    expect(setRolePermissionsMock).toHaveBeenCalledWith({
      roleId: "role-1",
      permissionIds: [],
    });
    expect(getUserRolesTriggerMock).not.toHaveBeenCalled();
    expect(setUserRolesMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith(ROLE_INDEX_PATH);
  });

  test("disables header actions while submit is in flight", async () => {
    const user = userEvent.setup();
    let resolveCreate:
      | ((value: {
          id: string;
          name: string;
          description: string | null;
          isSystem: boolean;
        }) => void)
      | null = null;

    createRoleMock.mockReturnValueOnce({
      unwrap: () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    });

    render(<CreateRolePage />);

    await user.type(screen.getByLabelText("Role Name"), "Moderators");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creating..." }),
      ).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    resolveCreate?.({
      id: "role-1",
      name: "Moderators",
      description: null,
      isSystem: false,
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(ROLE_INDEX_PATH);
    });
  });

  test("keeps entered draft values when creation fails", async () => {
    const user = userEvent.setup();

    createRoleMock.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error("create failed");
      },
    });

    render(<CreateRolePage />);

    await user.type(screen.getByLabelText("Role Name"), "Moderators");
    await user.type(screen.getByLabelText("Description"), "Night shift ops");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createRoleMock).toHaveBeenCalledTimes(1);
    });

    expect(setRolePermissionsMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalledWith(ROLE_INDEX_PATH);
    expect(screen.getByLabelText("Role Name")).toHaveValue("Moderators");
    expect(screen.getByLabelText("Description")).toHaveValue("Night shift ops");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });
});
