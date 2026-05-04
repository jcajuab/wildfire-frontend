import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

describe("useBulkSelection", () => {
  test("selects, deselects, clears, and removes successful ids", () => {
    const { result } = renderHook(() => useBulkSelection());

    act(() => {
      result.current.setItemSelected({ id: "a", label: "Alpha" }, true);
      result.current.setItemSelected({ id: "b", label: "Bravo" }, true);
    });

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.selectedItems).toEqual([
      { id: "a", label: "Alpha" },
      { id: "b", label: "Bravo" },
    ]);

    act(() => {
      result.current.removeSelectedIds(["a"]);
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.isSelected("b")).toBe(true);

    act(() => {
      result.current.setItemSelected({ id: "b", label: "Bravo" }, false);
    });

    expect(result.current.selectedCount).toBe(0);

    act(() => {
      result.current.setItemSelected({ id: "c", label: "Charlie" }, true);
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
  });
});
