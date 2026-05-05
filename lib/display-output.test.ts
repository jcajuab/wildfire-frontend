import { describe, expect, test } from "vitest";

import {
  DISPLAY_OUTPUT_TYPES,
  parseDisplayOutput,
  toCanonicalDisplayOutput,
} from "@/lib/display-output";

describe("display output helpers", () => {
  test("lists output types alphabetically and includes DVI", () => {
    expect(DISPLAY_OUTPUT_TYPES).toEqual(["DP", "DVI", "HDMI", "VGA"]);
  });

  test("parses and serializes DVI outputs", () => {
    expect(parseDisplayOutput("dvi-3")).toEqual({
      type: "DVI",
      index: 3,
    });
    expect(toCanonicalDisplayOutput({ type: "DVI", index: 3 })).toBe("dvi-3");
  });
});
