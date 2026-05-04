import { describe, expect, test, vi } from "vitest";
import { runBulkAction } from "@/lib/bulk-action";

describe("runBulkAction", () => {
  test("collects successful and failed items without stopping the batch", async () => {
    const action = vi.fn(async (item: string) => {
      if (item === "b") {
        throw new Error("blocked");
      }
    });

    const result = await runBulkAction(["a", "b", "c"], action, 2);

    expect(action).toHaveBeenCalledTimes(3);
    expect(result.successfulItems.toSorted()).toEqual(["a", "c"]);
    expect(result.failedItems).toHaveLength(1);
    expect(result.failedItems[0]?.item).toBe("b");
    expect(result.failedItems[0]?.error).toBeInstanceOf(Error);
  });
});
