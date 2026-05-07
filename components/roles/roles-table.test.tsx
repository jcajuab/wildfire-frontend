import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { RolesTable } from "./roles-table";
import type { Role, RoleSort } from "@/types/role";

const roles: Role[] = [
  {
    id: "role-1",
    name: "Operators",
    description: "Ops role",
    isSystem: false,
    usersCount: 2,
  },
  {
    id: "role-system",
    name: "Admin",
    description: "Global admin access",
    isSystem: true,
    usersCount: 1,
  },
];

function renderTable(
  overrides: {
    readonly sort?: RoleSort;
    readonly roles?: readonly Role[];
    readonly canEdit?: boolean;
    readonly canDelete?: boolean;
    readonly onSortChange?: (sort: RoleSort) => void;
    readonly onEdit?: (role: Role) => void;
    readonly onDelete?: (role: Role) => void;
  } = {},
) {
  const onSortChange = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(
    <RolesTable
      roles={overrides.roles ?? roles}
      sort={overrides.sort ?? { field: "name", direction: "asc" }}
      onSortChange={overrides.onSortChange ?? onSortChange}
      onEdit={overrides.onEdit ?? onEdit}
      onDelete={overrides.onDelete ?? onDelete}
      canEdit={overrides.canEdit}
      canDelete={overrides.canDelete}
    />,
  );

  return { onSortChange, onEdit, onDelete };
}

describe("RolesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders compact role columns without user count icons", () => {
    renderTable();

    expect(screen.getByRole("columnheader", { name: "Role" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Users" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "text-right",
    );
    expect(screen.getByText("Ops role")).toHaveClass("text-muted-foreground");
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  test("sorts role and users columns", async () => {
    const actor = userEvent.setup();
    const onSortChange = vi.fn();

    renderTable({ onSortChange });

    await actor.click(screen.getByRole("button", { name: "Role" }));
    expect(onSortChange).toHaveBeenCalledWith({
      field: "name",
      direction: "desc",
    });

    await actor.click(screen.getByRole("button", { name: "Users" }));
    expect(onSortChange).toHaveBeenCalledWith({
      field: "usersCount",
      direction: "asc",
    });
  });

  test("shows edit and delete actions for custom roles", async () => {
    const actor = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderTable({ onEdit, onDelete });

    await actor.click(screen.getByLabelText("Actions for Operators"));
    await actor.click(screen.getByRole("menuitem", { name: "Edit Role" }));
    expect(onEdit).toHaveBeenCalledWith(roles[0]);

    await actor.click(screen.getByLabelText("Actions for Operators"));
    await actor.click(screen.getByRole("menuitem", { name: "Delete Role" }));
    expect(onDelete).toHaveBeenCalledWith(roles[0]);
  });

  test("hides actions for system roles and rows without permissions", () => {
    renderTable({ canEdit: false, canDelete: false });

    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(
        within(row).queryByRole("button", { name: /Actions for/ }),
      ).not.toBeInTheDocument();
    }
  });

  test("renders an empty state inside the table area", () => {
    renderTable({ roles: [] });

    expect(
      screen.getByRole("heading", { name: "No roles found" }),
    ).toBeVisible();
  });
});
