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

    const footerLayout = screen.getByText("Showing 1 to 4 of 4 results")
      .parentElement;

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
});
