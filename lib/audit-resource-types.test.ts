import { describe, expect, test } from "vitest";
import {
  getResourceTypeFilterLabel,
  getResourceTypeLabel,
  getResourceTypeValueFromInput,
} from "@/lib/audit-resource-types";

describe("getResourceTypeLabel", () => {
  test("returns professional title case labels", () => {
    expect(getResourceTypeLabel("audit-event")).toBe("Audit Event");
    expect(getResourceTypeLabel("content")).toBe("Content Item");
    expect(getResourceTypeLabel("display")).toBe("Displays");
    expect(getResourceTypeLabel("playlist-item")).toBe("Playlist Item");
  });
});

describe("getResourceTypeFilterLabel", () => {
  test('returns "All" for the empty filter value', () => {
    expect(getResourceTypeFilterLabel("")).toBe("All");
  });
});

describe("getResourceTypeValueFromInput", () => {
  test('resolves "All" and sentinel input to the empty filter value', () => {
    expect(getResourceTypeValueFromInput("All")).toBe("");
    expect(getResourceTypeValueFromInput("__all__")).toBe("");
  });

  test("resolves label input to canonical value", () => {
    expect(getResourceTypeValueFromInput("Audit Event")).toBe("audit-event");
    expect(getResourceTypeValueFromInput("Content Item")).toBe("content");
    expect(getResourceTypeValueFromInput("Displays")).toBe("display");
    expect(getResourceTypeValueFromInput("Display Group")).toBe(
      "display-group",
    );
  });

  test("does not resolve unknown aliases", () => {
    expect(getResourceTypeValueFromInput("device")).toBeNull();
    expect(getResourceTypeValueFromInput("device-group")).toBeNull();
  });

  test("resolves canonical input with dashes", () => {
    expect(getResourceTypeValueFromInput("playlist-item")).toBe(
      "playlist-item",
    );
  });

  test("returns null for unknown input", () => {
    expect(getResourceTypeValueFromInput("Unknown Value")).toBeNull();
  });
});
