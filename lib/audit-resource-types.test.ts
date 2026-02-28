import { describe, expect, test } from "vitest";
import {
  getResourceTypeLabel,
  getResourceTypeValueFromInput,
} from "@/lib/audit-resource-types";

describe("getResourceTypeLabel", () => {
  test("returns professional title case labels", () => {
    expect(getResourceTypeLabel("audit-event")).toBe("Audit Event");
    expect(getResourceTypeLabel("content")).toBe("Content Item");
    expect(getResourceTypeLabel("device")).toBe("Displays");
    expect(getResourceTypeLabel("playlist-item")).toBe("Playlist Item");
  });
});

describe("getResourceTypeValueFromInput", () => {
  test("resolves label input to canonical value", () => {
    expect(getResourceTypeValueFromInput("Audit Event")).toBe("audit-event");
    expect(getResourceTypeValueFromInput("Content Item")).toBe("content");
    expect(getResourceTypeValueFromInput("Displays")).toBe("device");
    expect(getResourceTypeValueFromInput("Device Group")).toBe("device-group");
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
