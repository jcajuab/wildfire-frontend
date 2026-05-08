import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useRolesFilters } from "./use-roles-filters";

const setFiltersMock = vi.fn();

vi.mock("nuqs", () => ({
  debounce: vi.fn((value: number) => value),
  parseAsInteger: {
    withDefault: vi.fn((defaultValue: number) => ({
      defaultValue,
    })),
  },
  parseAsString: {
    withDefault: vi.fn(() => ({
      withOptions: vi.fn(() => ({
        defaultValue: "",
      })),
    })),
  },
  parseAsStringLiteral: vi.fn(() => ({
    withDefault: vi.fn((defaultValue: string) => ({
      defaultValue,
    })),
  })),
  useQueryStates: vi.fn(() => [
    {
      q: "",
      sortField: "name",
      sortDir: "asc",
      page: 2,
    },
    setFiltersMock,
  ]),
}));

describe("useRolesFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("updates search and resets pagination atomically", () => {
    const { result } = renderHook(() => useRolesFilters());

    act(() => {
      result.current.handleSearchChange("operator");
    });

    expect(setFiltersMock).toHaveBeenCalledTimes(1);
    expect(setFiltersMock).toHaveBeenCalledWith({ q: "operator", page: 1 });
  });

  test("updates sort and resets pagination atomically", () => {
    const { result } = renderHook(() => useRolesFilters());

    act(() => {
      result.current.handleSortChange({
        field: "usersCount",
        direction: "desc",
      });
    });

    expect(setFiltersMock).toHaveBeenCalledTimes(1);
    expect(setFiltersMock).toHaveBeenCalledWith({
      sortField: "usersCount",
      sortDir: "desc",
      page: 1,
    });
  });
});
