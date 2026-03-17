import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RoleForm, type RoleFormState } from "@/components/roles/role-form";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";
import { DESIGN_PERMISSIONS } from "@/lib/design-permissions";
import { formatPermissionReadableLabel } from "@/lib/format-permission";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import type { Permission } from "@/types/role";

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(),
}));

const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);

describe("RoleForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );

    useGetUserOptionsQueryMock.mockReset();
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders stacked display, permissions, and users sections without modal actions", () => {
    render(
      <RoleForm
        mode="create"
        permissions={[]}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Display" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Display" })).toHaveAttribute(
      "id",
      "role-form-display-heading",
    );
    expect(
      screen.getByRole("heading", { name: "Permissions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Permissions" }),
    ).toHaveAttribute("id", "role-form-permissions-heading");
    expect(
      screen.getByRole("heading", { name: /Manage Users/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Manage Users/ }),
    ).toHaveAttribute("id", "role-form-users-heading");
    expect(
      screen.getByRole("heading", { name: "Display" }).closest("section"),
    ).toHaveAttribute("aria-labelledby", "role-form-display-heading");
    expect(
      screen.getByRole("heading", { name: "Permissions" }).closest("section"),
    ).toHaveAttribute("aria-labelledby", "role-form-permissions-heading");
    expect(
      screen.getByRole("heading", { name: /Manage Users/ }).closest("section"),
    ).toHaveAttribute("aria-labelledby", "role-form-users-heading");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("navigation", { name: "Role form sections" }),
    ).not.toBeInTheDocument();
  });

  test("keeps the legacy bottom summary and live overview removed", () => {
    render(
      <RoleForm
        mode="edit"
        initialRole={{
          id: "role-1",
          name: "Operators",
          description: null,
          isSystem: false,
        }}
        permissions={[
          {
            id: "perm-roles-read",
            resource: "roles",
            action: "read",
          },
        ]}
        initialUsers={[
          {
            id: "user-1",
            name: "Alice",
            username: "alice",
            email: "alice@example.com",
          },
          {
            id: "user-2",
            name: "Bob",
            username: "bob",
            email: "bob@example.com",
          },
        ]}
        canReadUsers={true}
        initialPermissionIds={["perm-roles-read"]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText("Live Overview")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/This change will assign/i),
    ).not.toBeInTheDocument();
  });

  test("keeps permission resource groups in design order for heading anchors", () => {
    const permissions = DESIGN_PERMISSIONS.map((permission, index) => ({
      id: `perm-${index + 1}`,
      resource: permission.resource as PermissionResource,
      action: permission.action as PermissionAction,
    })) as Permission[];

    render(
      <RoleForm
        mode="create"
        permissions={permissions}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    const resourceOrder = [
      "displays",
      "content",
      "playlists",
      "schedules",
      "users",
      "roles",
      "audit",
    ] as const;

    const anchors = resourceOrder.map((resource) => {
      const resourceHeading = screen.queryByRole("heading", {
        name: new RegExp(`^${resource}$`, "i"),
      });

      if (resourceHeading) {
        return resourceHeading;
      }

      const firstAction = resource === "audit" ? "read" : "create";
      return screen.getByText(
        formatPermissionReadableLabel({ resource, action: firstAction }),
      );
    });

    for (let index = 1; index < anchors.length; index += 1) {
      const isFollowing = Boolean(
        anchors[index - 1].compareDocumentPosition(anchors[index]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(isFollowing).toBe(true);
    }

    for (const resource of resourceOrder) {
      expect(
        screen.getByRole("heading", {
          name: new RegExp(`^${resource}$`, "i"),
        }),
      ).toBeInTheDocument();
    }
  });

  test("keeps users restricted state when canReadUsers is false", () => {
    render(
      <RoleForm
        mode="create"
        permissions={[]}
        initialUsers={[]}
        canReadUsers={false}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
      { q: undefined },
      expect.objectContaining({
        refetchOnMountOrArgChange: true,
        skip: true,
      }),
    );
    expect(
      screen.getByText(/User assignment is unavailable without/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search users by name, username, or email"),
    ).not.toBeInTheDocument();
  });

  test("uses a standardized manage users control row", () => {
    render(
      <RoleForm
        mode="create"
        permissions={[]}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Search Users")).toBeInTheDocument();
    expect(screen.getByLabelText("Select User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add User" }),
    ).toBeInTheDocument();
  });

  test("keeps null-id permissions disabled", () => {
    render(
      <RoleForm
        mode="create"
        permissions={[]}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    const permissionSwitches = screen.getAllByRole("switch");
    expect(permissionSwitches.length).toBeGreaterThan(0);
    for (const permissionSwitch of permissionSwitches) {
      expect(permissionSwitch).toBeDisabled();
    }
  });

  test("preserves search query and assigned-user pagination behavior", async () => {
    const user = userEvent.setup();
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "user-1",
          name: "Alice",
          username: "alice",
          email: "alice@example.com",
        },
      ],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);

    const initialUsers = Array.from({ length: 26 }, (_, index) => ({
      id: `assigned-${index + 1}`,
      name: `Assigned ${index + 1}`,
      username: `assigned${index + 1}`,
      email: `assigned${index + 1}@example.com`,
    }));

    render(
      <RoleForm
        mode="edit"
        initialRole={{
          id: "role-1",
          name: "Editors",
          description: null,
          isSystem: false,
        }}
        permissions={[]}
        initialUsers={initialUsers}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Search users by name, username, or email"),
      "  ali  ",
    );

    await waitFor(() => {
      expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
        { q: "ali" },
        expect.objectContaining({
          refetchOnMountOrArgChange: true,
          skip: false,
        }),
      );
    });

    expect(screen.getByText("Assigned 25")).toBeInTheDocument();
    expect(screen.queryByText("Assigned 26")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load More Users" }));

    expect(screen.getByText("Assigned 26")).toBeInTheDocument();
  });

  test("supports parent-controlled form state without entering a render loop", async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [formState, setFormState] = useState<RoleFormState | null>(null);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void formState?.submit();
            }}
            disabled={!formState?.canSubmit || formState.isSubmitting}
          >
            {formState?.isSubmitting ? "Submitting" : "Submit"}
          </button>
          <RoleForm
            mode="edit"
            initialRole={{
              id: "role-1",
              name: "Editors",
              description: null,
              isSystem: false,
            }}
            permissions={[]}
            initialUsers={[]}
            canReadUsers={true}
            initialPermissionIds={[]}
            onSubmit={vi.fn()}
            onStateChange={setFormState}
          />
        </>
      );
    }

    render(<Wrapper />);

    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();

    await user.type(screen.getByLabelText("Description"), "Loop check");

    expect(screen.getByDisplayValue("Loop check")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  test("submits exact RoleFormData payload shape through parent-controlled submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    function Wrapper() {
      const [formState, setFormState] = useState<RoleFormState | null>(null);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void formState?.submit();
            }}
            disabled={!formState?.canSubmit || formState.isSubmitting}
          >
            {formState?.isSubmitting ? "Submitting" : "Submit"}
          </button>
          <RoleForm
            mode="edit"
            initialRole={{
              id: "role-1",
              name: "Operators",
              description: null,
              isSystem: false,
            }}
            permissions={[
              {
                id: "perm-roles-read",
                resource: "roles",
                action: "read",
              },
            ]}
            initialUsers={[
              {
                id: "user-1",
                name: "Alice",
                username: "alice",
                email: "alice@example.com",
              },
            ]}
            canReadUsers={true}
            initialPermissionIds={["perm-roles-read"]}
            onSubmit={onSubmit}
            onStateChange={setFormState}
          />
        </>
      );
    }

    render(<Wrapper />);

    const roleNameInput = screen.getByLabelText("Role Name");
    fireEvent.change(roleNameInput, {
      target: { value: "  Editors  " },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "  Night shift ops  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit.mock.calls[0][0]).toStrictEqual({
      name: "Editors",
      description: "Night shift ops",
      permissionIds: ["perm-roles-read"],
      userIds: ["user-1"],
    });
    expect(Object.keys(onSubmit.mock.calls[0][0]).sort()).toEqual([
      "description",
      "name",
      "permissionIds",
      "userIds",
    ]);
  });
});
