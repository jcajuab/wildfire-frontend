import { describe, expect, test } from "vitest";

import {
  DISPLAY_OUTPUT_TYPES,
  normalizeDisplayOutputFilter,
  parseDisplayOutput,
  parseDisplayOutputTypeFilter,
  toCanonicalDisplayOutput,
  toDisplayOutputTypeFilter,
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

  test("normalizes output filters to type wildcards", () => {
    expect(toDisplayOutputTypeFilter("HDMI")).toBe("hdmi-*");
    expect(parseDisplayOutputTypeFilter("hdmi-3")).toBe("HDMI");
    expect(parseDisplayOutputTypeFilter("dvi-*")).toBe("DVI");
    expect(parseDisplayOutputTypeFilter("VGA")).toBe("VGA");
    expect(normalizeDisplayOutputFilter("dp-0")).toBe("dp-*");
    expect(normalizeDisplayOutputFilter("unknown")).toBe("all");
  });
});
