import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Loading from "./loading";

describe("Displays loading state", () => {
  test("matches the current displays page shell", () => {
    render(<Loading />);

    const toolbar = screen.getByTestId("displays-loading-toolbar");
    const grid = screen.getByTestId("displays-loading-grid");
    const footer = screen.getByTestId("displays-loading-footer");

    expect(toolbar).toHaveClass("bg-background");
    expect(toolbar).toHaveClass("p-4");
    expect(screen.getAllByTestId("displays-loading-toolbar")).toHaveLength(1);
    expect(screen.getByTestId("displays-loading-title")).toHaveClass("w-28");
    expect(screen.getByTestId("displays-loading-search-group")).toHaveClass(
      "h-7",
      "md:max-w-168",
    );
    expect(screen.getByTestId("displays-loading-search")).toHaveClass(
      "h-3",
      "flex-1",
    );
    expect(screen.getByTestId("displays-loading-filter")).toHaveClass("size-6");
    expect(screen.getByTestId("displays-loading-bulk-unregister")).toHaveClass(
      "h-7",
      "sm:w-32",
    );
    expect(screen.getByTestId("displays-loading-manage")).toHaveClass(
      "h-7",
      "sm:w-36",
    );

    expect(grid).toHaveClass("grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]");
    expect(screen.getAllByTestId("displays-loading-card")).toHaveLength(6);
    expect(screen.getAllByTestId("displays-loading-card")[0]).toHaveClass(
      "rounded-xl",
      "border",
      "bg-card",
      "p-4",
    );
    expect(screen.getAllByTestId("displays-loading-preview")[0]).toHaveClass(
      "aspect-[16/8.5]",
      "rounded-xl",
    );

    expect(footer).toHaveClass("border-t", "bg-background/80");
    expect(footer.firstElementChild).toHaveClass(
      "w-full",
      "sm:justify-between",
    );
  });
});
