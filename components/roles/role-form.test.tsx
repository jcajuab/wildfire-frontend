import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RoleForm, type RoleFormState } from "@/components/roles/role-form";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";
import { DESIGN_PERMISSIONS } from "@/lib/design-permissions";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import type { Permission } from "@/types/role";

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(),
}));

const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);

function buildDesignPermissions(): Permission[] {
  return DESIGN_PERMISSIONS.map((permission) => ({
    id: `${permission.resource}:${permission.action}`,
    resource: permission.resource as PermissionResource,
    action: permission.action as PermissionAction,
  })) as Permission[];
}

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

  test("renders stacked role details, permissions, and users sections without modal actions", () => {
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
      screen.getByRole("heading", { level: 2, name: "Role Details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Role Details" }),
    ).toHaveAttribute("id", "role-form-display-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Permissions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Permissions" }),
    ).toHaveAttribute("id", "role-form-permissions-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: /Manage Users/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Manage Users/ }),
    ).toHaveAttribute("id", "role-form-users-heading");
    expect(
      screen
        .getByRole("heading", { level: 2, name: "Role Details" })
        .closest("section"),
    ).toHaveAttribute("aria-labelledby", "role-form-display-heading");
    expect(
      screen
        .getByRole("heading", { level: 2, name: "Permissions" })
        .closest("section"),
    ).toHaveAttribute("aria-labelledby", "role-form-permissions-heading");
    expect(
      screen
        .getByRole("heading", { level: 2, name: /Manage Users/ })
        .closest("section"),
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
    expect(screen.getByRole("button", { name: /Core/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Manage/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("button", { name: /^AI.*permissions$/i }),
    ).toHaveAttribute("aria-expanded", "false");
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

  test("keeps permission groups in sidebar order with compact resource rows", async () => {
    const user = userEvent.setup();
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

    const coreTrigger = screen.getByRole("button", { name: /Core/i });
    const manageTrigger = screen.getByRole("button", { name: /Manage/i });
    const aiTrigger = screen.getByRole("button", {
      name: /^AI.*permissions$/i,
    });
    expect(coreTrigger.compareDocumentPosition(manageTrigger)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(manageTrigger.compareDocumentPosition(aiTrigger)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(coreTrigger).toHaveAttribute("aria-expanded", "true");
    expect(manageTrigger).toHaveAttribute("aria-expanded", "false");
    expect(aiTrigger).toHaveAttribute("aria-expanded", "false");

    const coreResources = ["Displays", "Content", "Playlists", "Schedules"];
    const coreAnchors = coreResources.map((resource) =>
      screen.getByText(resource),
    );
    for (let index = 1; index < coreAnchors.length; index += 1) {
      const isFollowing = Boolean(
        coreAnchors[index - 1].compareDocumentPosition(coreAnchors[index]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(isFollowing).toBe(true);
    }

    await user.click(manageTrigger);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Access AI" })).toBeNull();
    await user.click(aiTrigger);
    expect(screen.getAllByText("AI").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("checkbox", { name: "Access AI" }),
    ).toBeInTheDocument();
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

    expect(screen.getByLabelText("Assign User")).toBeInTheDocument();
    expect(screen.queryByLabelText("Search Users")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Select User")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add User" }),
    ).toBeInTheDocument();
  });

  test("selects and adds a user from the assignment combobox", async () => {
    const user = userEvent.setup();
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "user-2",
          name: "Bob",
          username: "bob",
          email: null,
        },
      ],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);

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
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    const addUserButton = screen.getByRole("button", { name: "Add User" });
    expect(addUserButton).toBeDisabled();

    await user.click(screen.getByLabelText("Assign User"));
    await user.type(screen.getByLabelText("Assign User"), "bob");

    fireEvent.pointerDown(await screen.findByRole("option", { name: /Bob/ }));

    await waitFor(() => {
      expect(addUserButton).toBeEnabled();
    });

    fireEvent.click(addUserButton);

    expect(
      screen.getByRole("region", { name: "Manage Users (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
    expect(screen.getByLabelText("Assign User")).toHaveValue("");
    expect(addUserButton).toBeDisabled();
  });

  test("clears the selected user when the assignment combobox is edited after selection", async () => {
    const user = userEvent.setup();
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [
        {
          id: "user-2",
          name: "Bob",
          username: "bob",
          email: null,
        },
      ],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);

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
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    const combobox = screen.getByLabelText("Assign User");
    const addUserButton = screen.getByRole("button", { name: "Add User" });

    await user.click(combobox);
    await user.type(combobox, "bob");
    fireEvent.pointerDown(await screen.findByRole("option", { name: /Bob/ }));

    await waitFor(() => {
      expect(addUserButton).toBeEnabled();
    });

    await user.clear(combobox);

    expect(addUserButton).toBeDisabled();
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

    const permissionCheckboxes = screen.getAllByRole("checkbox");
    expect(permissionCheckboxes.length).toBeGreaterThan(0);
    for (const permissionCheckbox of permissionCheckboxes) {
      expect(permissionCheckbox).toBeDisabled();
    }
  });

  test("includes all assignable canonical permissions in the design grid", () => {
    const permissionKeys = DESIGN_PERMISSIONS.map(
      (permission) => `${permission.resource}:${permission.action}`,
    );

    expect(permissionKeys).toContain("audit:read");
    expect(permissionKeys).toContain("audit:delete");
    expect(permissionKeys).toContain("ai:access");
    expect(permissionKeys).not.toContain("admin:access");
  });

  test("selects core view permissions by default when creating a role", async () => {
    render(
      <RoleForm
        mode="create"
        permissions={buildDesignPermissions()}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "View Displays" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "View Content" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "View Playlists" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "View Schedules" }),
      ).toBeChecked();
    });

    await userEvent.click(screen.getByRole("button", { name: /Manage/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /^AI.*permissions$/i }),
    );
    expect(
      screen.getByRole("checkbox", { name: "View Users" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "View Roles" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "View Audit" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Delete Audit" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Access AI" }),
    ).not.toBeChecked();
  });

  test("keeps matching view permission selected while write permissions are enabled", async () => {
    const user = userEvent.setup();

    render(
      <RoleForm
        mode="create"
        permissions={buildDesignPermissions()}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Manage/i }));

    const createUsers = screen.getByRole("checkbox", {
      name: "Create Users",
    });
    const viewUsers = screen.getByRole("checkbox", { name: "View Users" });

    expect(viewUsers).not.toBeChecked();
    expect(viewUsers).toBeEnabled();

    await user.click(createUsers);

    expect(createUsers).toBeChecked();
    expect(viewUsers).toBeChecked();
    expect(viewUsers).toBeDisabled();

    await user.click(createUsers);

    expect(createUsers).not.toBeChecked();
    expect(viewUsers).toBeChecked();
    expect(viewUsers).toBeEnabled();

    await user.click(viewUsers);

    expect(viewUsers).not.toBeChecked();
  });

  test("does not add create-mode defaults while editing roles", () => {
    render(
      <RoleForm
        mode="edit"
        initialRole={{
          id: "role-1",
          name: "Operators",
          description: null,
          isSystem: false,
        }}
        permissions={buildDesignPermissions()}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={[]}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "View Displays" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "View Content" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "View Playlists" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "View Schedules" }),
    ).not.toBeChecked();
  });

  test("normalizes edit-mode write permissions to include matching view permission", async () => {
    render(
      <RoleForm
        mode="edit"
        initialRole={{
          id: "role-1",
          name: "Operators",
          description: null,
          isSystem: false,
        }}
        permissions={buildDesignPermissions()}
        initialUsers={[]}
        canReadUsers={true}
        initialPermissionIds={["users:create"]}
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "Create Users" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "View Users" }),
      ).toBeChecked();
    });

    expect(screen.getByRole("checkbox", { name: "View Users" })).toBeDisabled();
  });

  test("submits normalized dependency permission ids", async () => {
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
          >
            Submit
          </button>
          <RoleForm
            mode="edit"
            initialRole={{
              id: "role-1",
              name: "Operators",
              description: null,
              isSystem: false,
            }}
            permissions={buildDesignPermissions()}
            initialUsers={[]}
            canReadUsers={true}
            initialPermissionIds={["users:create"]}
            onSubmit={onSubmit}
            onStateChange={setFormState}
          />
        </>
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      permissionIds: ["users:create", "users:read"],
    });
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

    await user.keyboard("{Escape}");
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
