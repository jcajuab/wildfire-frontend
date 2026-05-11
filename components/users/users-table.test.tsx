import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { UsersTable } from "./users-table";
import type { User, UserRole, UserSort } from "@/types/user";

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const { fill, unoptimized, ...imgProps } = props;
    void fill;
    void unoptimized;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...imgProps} alt={imgProps.alt ?? ""} />
    );
  },
}));

const roles: readonly UserRole[] = [
  { id: "role-admin", name: "Admin" },
  { id: "role-viewer", name: "Viewer" },
];

const user: User = {
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  name: "Alice",
  isActive: true,
  roles,
  lastSeenAt: "2026-05-07T05:43:21.000Z",
};

const sort: UserSort = {
  field: "name",
  direction: "asc",
};

function renderUsersTable(
  overrides: {
    readonly users?: readonly User[];
    readonly userRolesByUserId?: Readonly<Record<string, readonly UserRole[]>>;
    readonly canUpdate?: boolean;
    readonly canDelete?: boolean;
    readonly currentUserId?: string | null;
    readonly availableRoles?: readonly UserRole[];
    readonly roleFilter?: string;
    readonly onRoleFilterChange?: (roleId: string) => void;
    readonly onUserTypeFilterChange?: () => void;
    readonly systemRoleIds?: readonly string[];
  } = {},
) {
  render(
    <UsersTable
      users={overrides.users ?? [user]}
      availableRoles={overrides.availableRoles ?? roles}
      userRolesByUserId={
        overrides.userRolesByUserId ?? {
          [user.id]: roles,
        }
      }
      sort={sort}
      onSortChange={vi.fn()}
      onEdit={vi.fn()}
      onRoleToggle={vi.fn()}
      onBanUser={vi.fn()}
      onUnbanUser={vi.fn()}
      onDeleteUser={vi.fn()}
      onResetPassword={vi.fn()}
      roleFilter={overrides.roleFilter}
      onRoleFilterChange={overrides.onRoleFilterChange}
      onUserTypeFilterChange={overrides.onUserTypeFilterChange}
      canUpdate={overrides.canUpdate}
      canDelete={overrides.canDelete}
      systemRoleIds={overrides.systemRoleIds}
      currentUserId={overrides.currentUserId}
    />,
  );
}

describe("UsersTable", () => {
  test("renders compact users columns with sortable email and plain roles header", () => {
    renderUsersTable();

    expect(
      screen.getByRole("columnheader", { name: /Name.*sort descending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /Email.*sort ascending/ }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Roles" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", {
        name: /Last Seen.*sort ascending/,
      }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "text-right",
    );
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(row).toHaveClass("h-12");
    }

    expect(
      within(
        screen.getByRole("columnheader", { name: /Email.*sort ascending/ }),
      ).queryByRole("button"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("columnheader", { name: "Roles" })).queryByRole(
        "button",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /adjustments/i }),
    ).not.toBeInTheDocument();
  });

  test("filters by non-system roles from the roles header", async () => {
    const actor = userEvent.setup();
    const onRoleFilterChange = vi.fn();

    renderUsersTable({
      availableRoles: [{ id: "role-viewer", name: "Viewer" }],
      roleFilter: "all",
      onRoleFilterChange,
    });

    await actor.click(
      screen.getByRole("button", { name: "Filter users by role" }),
    );

    expect(
      screen.getByRole("menuitemradio", { name: "All roles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Viewer" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: "Admin" }),
    ).not.toBeInTheDocument();

    await actor.click(screen.getByRole("menuitemradio", { name: "Viewer" }));

    expect(onRoleFilterChange).toHaveBeenCalledWith("role-viewer");
  });

  test("renders user identity, separate email, muted fallbacks, and outline roles", () => {
    renderUsersTable({
      currentUserId: "user-1",
      users: [
        {
          ...user,
          email: null,
          lastSeenAt: null,
        },
      ],
    });

    expect(screen.getByText("Alice")).toHaveClass("truncate", "font-medium");
    expect(screen.getByText("(You)")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("@alice")).toHaveClass("truncate");
    expect(screen.getByText("@alice").parentElement).toHaveClass(
      "min-h-8",
      "justify-center",
    );
    expect(screen.getByText("No email available")).toHaveClass(
      "text-muted-foreground",
    );
    expect(screen.getByText("Never")).toHaveClass("tabular-nums");
    expect(screen.getByText("Never")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Admin")).toHaveClass("border-blue-200");
    expect(screen.getByText("Admin")).toHaveClass("bg-blue-50");
    expect(screen.getByText("Admin")).toHaveClass("shrink-0");
    expect(screen.getByText("Admin").parentElement).toHaveClass(
      "flex-nowrap",
      "overflow-hidden",
    );
  });

  test("uses semantic colors for user type badges", () => {
    renderUsersTable({
      users: [
        user,
        {
          ...user,
          id: "user-invited",
          username: "invited",
          name: "Invited User",
          isInvitedUser: true,
        },
        {
          ...user,
          id: "user-banned",
          username: "banned",
          name: "Banned User",
          bannedAt: "2026-05-10T00:00:00.000Z",
          isActive: false,
        },
      ],
      userRolesByUserId: {
        [user.id]: [],
        "user-invited": [],
        "user-banned": [],
      },
    });

    expect(screen.getByText("DCISM")).toHaveClass(
      "border-blue-200",
      "bg-blue-50",
      "text-blue-700",
    );
    expect(screen.getByText("Invited")).toHaveClass(
      "border-amber-200",
      "bg-amber-50",
      "text-amber-700",
    );
    expect(screen.getByText("Banned")).toHaveClass(
      "border-red-200",
      "bg-red-50",
      "text-red-700",
    );
  });

  test("keeps long names and emails constrained inside the table cells", () => {
    const longUser: User = {
      ...user,
      id: "user-long",
      name: "Alexandria Cassandra Montgomery-Smith With A Very Long Name",
      username: "alexandria-cassandra-montgomery-smith",
      email:
        "alexandria.cassandra.montgomery-smith.with.a.very.long.email@example.edu",
    };

    renderUsersTable({
      users: [longUser],
      userRolesByUserId: {
        [longUser.id]: roles,
      },
    });

    expect(screen.getByText(longUser.name)).toHaveClass("truncate");
    expect(screen.getByText(longUser.email ?? "")).toHaveClass(
      "max-w-[18rem]",
      "truncate",
    );
  });

  test("keeps row actions accessible and hides them when no actions are allowed", () => {
    const { rerender } = render(
      <UsersTable
        users={[user]}
        availableRoles={roles}
        userRolesByUserId={{ [user.id]: roles }}
        sort={sort}
        onSortChange={vi.fn()}
        onEdit={vi.fn()}
        onRoleToggle={vi.fn()}
        onBanUser={vi.fn()}
        onUnbanUser={vi.fn()}
        onDeleteUser={vi.fn()}
        onResetPassword={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Actions for Alice" }),
    ).toBeInTheDocument();

    rerender(
      <UsersTable
        users={[user]}
        availableRoles={roles}
        userRolesByUserId={{ [user.id]: roles }}
        sort={sort}
        onSortChange={vi.fn()}
        onEdit={vi.fn()}
        onRoleToggle={vi.fn()}
        onBanUser={vi.fn()}
        onUnbanUser={vi.fn()}
        onDeleteUser={vi.fn()}
        onResetPassword={vi.fn()}
        canUpdate={false}
        canDelete={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Actions for Alice" }),
    ).not.toBeInTheDocument();
  });

  test("shows invited-only reset and delete actions in a wider menu", async () => {
    const actor = userEvent.setup();
    renderUsersTable({
      users: [{ ...user, isInvitedUser: true }],
    });

    await actor.click(
      screen.getByRole("button", { name: "Actions for Alice" }),
    );

    expect(screen.getByRole("menu")).toHaveClass("w-52");
    expect(
      screen.getByRole("menuitem", { name: "Reset Password" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete User" }),
    ).toBeInTheDocument();

    const menuItems = screen
      .getAllByRole("menuitem")
      .map((item) => item.textContent);
    expect(menuItems).toEqual([
      "Edit User",
      "Reset Password",
      "Roles",
      "Ban User",
      "Delete User",
    ]);
  });

  test("does not show delete user for DCISM users", async () => {
    const actor = userEvent.setup();
    renderUsersTable();

    await actor.click(
      screen.getByRole("button", { name: "Actions for Alice" }),
    );

    expect(
      screen.queryByRole("menuitem", { name: "Delete User" }),
    ).not.toBeInTheDocument();
  });

  test("shows invited user deletion for delete-only managers", async () => {
    const actor = userEvent.setup();
    renderUsersTable({
      users: [{ ...user, isInvitedUser: true }],
      canUpdate: false,
      canDelete: true,
    });

    await actor.click(
      screen.getByRole("button", { name: "Actions for Alice" }),
    );

    expect(
      screen.queryByRole("menuitem", { name: "Edit User" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete User" }),
    ).toBeInTheDocument();
  });

  test("hides row actions for admin users with a system role", () => {
    renderUsersTable({
      systemRoleIds: ["role-admin"],
    });

    expect(
      screen.queryByRole("button", { name: "Actions for Alice" }),
    ).not.toBeInTheDocument();
  });

  test("keeps table headers and filters visible for empty results", () => {
    renderUsersTable({
      users: [],
      userRolesByUserId: {},
      onRoleFilterChange: vi.fn(),
      onUserTypeFilterChange: vi.fn(),
    });

    expect(
      screen.getByRole("columnheader", { name: /Name.*sort descending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /Email.*sort ascending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Filter users by user type" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Filter users by role" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No users found" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No users found" }).closest("tr"),
    ).toHaveClass("border-0", "hover:bg-transparent");
    expect(
      screen.getByRole("heading", { name: "No users found" }).closest("div"),
    ).toHaveClass("border-0", "bg-transparent");
    expect(
      screen
        .getByRole("heading", { name: "No users found" })
        .closest("td")
        ?.querySelector("svg"),
    ).not.toBeInTheDocument();
  });
});
