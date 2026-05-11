import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

    expect(
      screen.getByRole("columnheader", { name: /Name.*sort descending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /Users.*sort ascending/ }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "text-right",
    );
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(row).toHaveClass("h-12");
    }
    expect(
      screen.getByRole("button", { name: /Name.*sort descending/ }),
    ).toHaveClass("-ml-1");
    expect(
      screen.getByRole("button", { name: /Users.*sort ascending/ }),
    ).toHaveClass("mx-auto");
    expect(screen.getByRole("cell", { name: "2" })).toHaveClass("text-center");
    expect(screen.getByRole("cell", { name: "2" })).toHaveClass("tabular-nums");
    expect(screen.getByText("Ops role")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Operators").parentElement).toHaveClass(
      "min-h-8",
      "items-center",
    );
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  test("sorts name and users columns", async () => {
    const actor = userEvent.setup();
    const onSortChange = vi.fn();

    renderTable({ onSortChange });

    await actor.click(
      screen.getByRole("button", { name: /Name.*sort descending/ }),
    );
    expect(onSortChange).toHaveBeenCalledWith({
      field: "name",
      direction: "desc",
    });

    await actor.click(
      screen.getByRole("button", { name: /Users.*sort ascending/ }),
    );
    expect(onSortChange).toHaveBeenCalledWith({
      field: "usersCount",
      direction: "asc",
    });
  });

  test("continues toggling name sort after the controlled sort state updates", async () => {
    const actor = userEvent.setup();

    function ControlledRolesTable() {
      const [sort, setSort] = useState<RoleSort>({
        field: "name",
        direction: "asc",
      });

      return (
        <RolesTable
          roles={roles}
          sort={sort}
          onSortChange={setSort}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
    }

    render(<ControlledRolesTable />);

    await actor.click(
      screen.getByRole("button", { name: /Name.*sort descending/ }),
    );
    expect(
      screen.getByRole("button", { name: /Name.*sort ascending/ }),
    ).toBeVisible();

    await actor.click(
      screen.getByRole("button", { name: /Name.*sort ascending/ }),
    );
    expect(
      screen.getByRole("button", { name: /Name.*sort descending/ }),
    ).toBeVisible();
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
      screen.getByRole("columnheader", { name: /Name.*sort descending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: /Users.*sort ascending/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No roles found" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No roles found" }).closest("tr"),
    ).toHaveClass("border-0", "hover:bg-transparent");
    expect(
      screen.getByRole("heading", { name: "No roles found" }).closest("div"),
    ).toHaveClass("border-0", "bg-transparent");
  });
});
