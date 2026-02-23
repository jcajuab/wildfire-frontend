import { describe, expect, test } from "vitest";
import {
  getNextDisplayGroupColorIndex,
  PALETTE_SIZE,
} from "@/lib/display-group-colors";

describe("display-group-colors", () => {
  test("starts color cycle at zero when no groups exist", () => {
    expect(getNextDisplayGroupColorIndex([])).toBe(0);
  });

  test("cycles after reaching the palette limit", () => {
    expect(
      getNextDisplayGroupColorIndex([{ colorIndex: PALETTE_SIZE - 1 }]),
    ).toBe(0);
  });

  test("picks the next color based on max existing color index", () => {
    expect(
      getNextDisplayGroupColorIndex([{ colorIndex: 1 }, { colorIndex: 4 }]),
    ).toBe(5);
  });
});
