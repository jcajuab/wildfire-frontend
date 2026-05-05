import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Loading from "./loading";

describe("Content loading state", () => {
  test("matches the current content page shell", () => {
    render(<Loading />);

    const toolbar = screen.getByTestId("content-loading-toolbar");
    const grid = screen.getByTestId("content-loading-grid");
    const footer = screen.getByTestId("content-loading-footer");

    expect(toolbar).toHaveClass("bg-background");
    expect(toolbar).toHaveClass("p-4");
    expect(screen.getByTestId("content-loading-title")).toHaveClass("w-24");
    expect(screen.getByTestId("content-loading-search-group")).toHaveClass(
      "h-7",
      "md:max-w-168",
    );
    expect(screen.getByTestId("content-loading-search")).toHaveClass(
      "h-3",
      "flex-1",
    );
    expect(screen.getByTestId("content-loading-filter")).toHaveClass("size-6");
    expect(screen.getByTestId("content-loading-create")).toHaveClass(
      "h-7",
      "sm:w-32",
    );
    expect(screen.getByTestId("content-loading-bulk-delete")).toHaveClass(
      "h-7",
      "sm:w-24",
    );

    expect(grid).toHaveClass("grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]");
    expect(screen.getAllByTestId("content-loading-card")).toHaveLength(8);
    expect(screen.getAllByTestId("content-loading-card")[0]).toHaveClass(
      "rounded-lg",
      "border",
      "bg-card",
    );

    expect(footer).toHaveClass("border-t", "bg-background/80");
    expect(footer.firstElementChild).toHaveClass(
      "w-full",
      "sm:justify-between",
    );
  });
});
