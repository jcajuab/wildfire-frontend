import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Loading from "./loading";

describe("Playlists loading state", () => {
  test("matches the current playlists page shell", () => {
    render(<Loading />);

    const toolbar = screen.getByTestId("playlists-loading-toolbar");
    const grid = screen.getByTestId("playlists-loading-grid");
    const footer = screen.getByTestId("playlists-loading-footer");

    expect(toolbar).toHaveClass("bg-background", "p-4");
    expect(screen.getByTestId("playlists-loading-search-group")).toHaveClass(
      "h-7",
      "md:max-w-168",
    );
    expect(grid).toHaveClass("grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]");
    expect(screen.getAllByTestId("playlists-loading-card")).toHaveLength(6);
    expect(footer).toHaveClass("border-t", "bg-background/80");
  });
});
