import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PaginationFooter } from "@/components/common/pagination-footer";

describe("PaginationFooter", () => {
  test("spaces the result count and pagination controls across the footer", () => {
    render(
      <PaginationFooter
        page={1}
        pageSize={20}
        total={4}
        onPageChange={vi.fn()}
        alwaysShow
      />,
    );

    const footerLayout = screen.getByText(
      "Showing 1 to 4 of 4 results",
    ).parentElement;

    expect(footerLayout).toHaveClass("w-full");
    expect(footerLayout).toHaveClass("sm:justify-between");
    expect(screen.getByLabelText("pagination")).toHaveClass(
      "mx-0",
      "sm:justify-end",
    );
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("keeps compact pagination controls at a consistent height", () => {
    render(
      <PaginationFooter
        page={1}
        pageSize={20}
        total={20}
        onPageChange={vi.fn()}
        alwaysShow
      />,
    );

    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveClass("h-7", "min-w-7");
    expect(screen.getByRole("link", { name: "1" })).toHaveClass(
      "h-7",
      "min-w-7",
    );
    expect(screen.getByRole("link", { name: "Go to next page" })).toHaveClass(
      "h-7",
      "min-w-7",
    );
  });

  test("keeps numbered pagination ellipses aligned with page controls", () => {
    render(
      <PaginationFooter
        page={10}
        pageSize={20}
        total={400}
        onPageChange={vi.fn()}
        alwaysShow
      />,
    );

    expect(screen.getByRole("link", { name: "10" })).toHaveClass(
      "h-7",
      "min-w-7",
    );
    for (const ellipsis of screen.getAllByText("...")) {
      expect(ellipsis).toHaveClass("h-7", "min-w-7");
    }
  });
});
