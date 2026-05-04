import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BulkSelectionToolbar } from "@/components/common/bulk-selection-toolbar";

describe("BulkSelectionToolbar", () => {
  test("renders select mode actions without shadow styling", () => {
    const { container } = render(
      <BulkSelectionToolbar
        selectedCount={0}
        deleteLabel="Delete selected"
        onDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete selected" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveClass("shadow-sm");
  });
});
