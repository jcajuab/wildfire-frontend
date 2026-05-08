import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { SortableHeader } from "./sortable-header";

describe("SortableHeader", () => {
  test("labels the next sort action and toggles active columns", async () => {
    const actor = userEvent.setup();
    const onSort = vi.fn();

    render(
      <SortableHeader
        label="Name"
        field="name"
        currentSort={{ field: "name", direction: "asc" }}
        onSort={onSort}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Name.*sort descending/,
    });

    expect(button).toHaveAttribute("title", "Sort by Name descending");

    await actor.click(button);

    expect(onSort).toHaveBeenCalledWith("name", "desc");
  });

  test("starts inactive columns in ascending order", async () => {
    const actor = userEvent.setup();
    const onSort = vi.fn();

    render(
      <SortableHeader
        label="Users"
        field="usersCount"
        currentSort={{ field: "name", direction: "desc" }}
        onSort={onSort}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: /Users.*sort ascending/ }),
    );

    expect(onSort).toHaveBeenCalledWith("usersCount", "asc");
  });
});
