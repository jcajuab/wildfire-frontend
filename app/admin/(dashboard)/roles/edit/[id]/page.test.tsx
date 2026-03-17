import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import EditRolePage from "./page";
import { useEditRolePage, type EditRolePageState } from "./use-edit-role-page";
import { useParams } from "next/navigation";

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock("./use-edit-role-page", () => ({
  useEditRolePage: vi.fn(),
}));

const mockFormPayload = {
  name: "Operators",
  description: "Ops team",
  permissionIds: ["roles:read"],
  userIds: ["user-1"],
};

vi.mock("@/components/roles/role-form", () => ({
  RoleForm: ({
    onSubmit,
    onStateChange,
  }: {
    onSubmit: (data: typeof mockFormPayload) => Promise<void> | void;
    onStateChange?: (state: {
      canSubmit: boolean;
      isSubmitting: boolean;
      submit: () => Promise<void>;
    }) => void;
  }) => {
    useEffect(() => {
      onStateChange?.({
        canSubmit: true,
        isSubmitting: false,
        submit: async () => {
          await onSubmit(mockFormPayload);
        },
      });
    }, [onStateChange, onSubmit]);

    return <div data-testid="role-form">Role Form</div>;
  },
}));

const useParamsMock = vi.mocked(useParams);
const useEditRolePageMock = vi.mocked(useEditRolePage);

const baseRole = {
  id: "role-1",
  name: "Operators",
  description: "Ops team",
  isSystem: false,
};

const buildState = (
  overrides: Partial<EditRolePageState>,
): EditRolePageState => {
  const base: EditRolePageState = {
    status: "ready",
    role: baseRole,
    permissions: [],
    initialPermissionIds: [],
    initialUsers: [],
  };

  return {
    ...base,
    ...overrides,
  } as EditRolePageState;
};

function findAncestorWithClasses(
  element: HTMLElement,
  classNames: string[],
): HTMLElement | null {
  let current = element.parentElement;

  while (current) {
    if (classNames.every((className) => current.classList.contains(className))) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

describe("EditRolePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useParamsMock.mockReturnValue({ id: "role-123" });
    useEditRolePageMock.mockReturnValue({
      state: buildState({}),
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });
  });

  test("renders Edit Role title and ready editor state", () => {
    render(<EditRolePage />);

    expect(
      screen.getByRole("heading", { name: "Edit Role" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("role-form")).toBeInTheDocument();
    expect(useEditRolePageMock).toHaveBeenCalledWith("role-123");
  });

  test("uses an inner scroll wrapper for the ready state", () => {
    render(<EditRolePage />);

    const roleForm = screen.getByTestId("role-form");
    const scrollWrapper = findAncestorWithClasses(roleForm, [
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

    const contentShell = findAncestorWithClasses(roleForm, [
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

  test("renders explicit loading state", () => {
    useEditRolePageMock.mockReturnValueOnce({
      state: { status: "loading" },
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    const loadingMessage = screen.getByText("Loading role...");

    expect(loadingMessage).toBeInTheDocument();
    expect(screen.queryByTestId("role-form")).not.toBeInTheDocument();
    expect(
      findAncestorWithClasses(loadingMessage, [
        "flex",
        "min-h-0",
        "flex-1",
        "items-center",
        "justify-center",
        "overflow-auto",
        "overscroll-none",
        "px-6",
        "py-6",
        "sm:px-8",
        "sm:py-8",
      ]),
    ).not.toBeNull();
  });

  test("renders back-to-roles empty state for missing role", () => {
    useEditRolePageMock.mockReturnValueOnce({
      state: {
        status: "notFound",
        message: "The requested role was not found.",
      },
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    const heading = screen.getByRole("heading", { name: "Role not found" });

    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Roles" })).toHaveAttribute(
      "href",
      "/admin/roles",
    );
    expect(screen.queryByTestId("role-form")).not.toBeInTheDocument();
    expect(
      findAncestorWithClasses(heading, [
        "flex",
        "min-h-0",
        "flex-1",
        "overflow-auto",
        "overscroll-none",
        "px-6",
        "py-6",
        "sm:px-8",
        "sm:py-8",
      ]),
    ).not.toBeNull();
  });

  test("renders error state with back-to-roles action", () => {
    useEditRolePageMock.mockReturnValueOnce({
      state: {
        status: "error",
        message: "Failed to load role details.",
      },
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    const heading = screen.getByRole("heading", { name: "Unable to load role" });

    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Roles" })).toHaveAttribute(
      "href",
      "/admin/roles",
    );
    expect(screen.queryByTestId("role-form")).not.toBeInTheDocument();
    expect(
      findAncestorWithClasses(heading, [
        "flex",
        "min-h-0",
        "flex-1",
        "overflow-auto",
        "overscroll-none",
        "px-6",
        "py-6",
        "sm:px-8",
        "sm:py-8",
      ]),
    ).not.toBeNull();
  });

  test("blocks editing system roles with non-editable state", () => {
    useEditRolePageMock.mockReturnValueOnce({
      state: {
        status: "nonEditable",
        role: {
          ...baseRole,
          isSystem: true,
        },
        message: "System roles are managed by Wildfire and cannot be edited.",
      },
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    const heading = screen.getByRole("heading", {
      name: "System role cannot be edited",
    });

    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Roles" })).toHaveAttribute(
      "href",
      "/admin/roles",
    );
    expect(screen.queryByTestId("role-form")).not.toBeInTheDocument();
    expect(
      findAncestorWithClasses(heading, [
        "flex",
        "min-h-0",
        "flex-1",
        "overflow-auto",
        "overscroll-none",
        "px-6",
        "py-6",
        "sm:px-8",
        "sm:py-8",
      ]),
    ).not.toBeNull();
  });

  test("calls handleCancel when cancel action is clicked", async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    useEditRolePageMock.mockReturnValue({
      state: buildState({}),
      canReadUsers: true,
      isSaving: false,
      handleCancel,
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  test("submits through save action and calls handleSave with form payload", async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    useEditRolePageMock.mockReturnValue({
      state: buildState({}),
      canReadUsers: true,
      isSaving: false,
      handleCancel: vi.fn(),
      handleSave,
    });

    render(<EditRolePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save Changes" }),
      ).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(handleSave).toHaveBeenCalledWith(mockFormPayload);
  });

  test("shows saving state when hook reports active save", () => {
    useEditRolePageMock.mockReturnValue({
      state: buildState({}),
      canReadUsers: true,
      isSaving: true,
      handleCancel: vi.fn(),
      handleSave: vi.fn(),
    });

    render(<EditRolePage />);

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
