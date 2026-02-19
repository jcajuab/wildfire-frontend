import { describe, expect, test } from "vitest";
import { can } from "@/lib/permissions";

describe("permissions.can", () => {
  test("matches exact permission", () => {
    expect(can("devices:read", ["devices:read"])).toBe(true);
  });

  test("supports wildcard resource", () => {
    expect(can("devices:read", ["*:read"])).toBe(true);
  });

  test("supports manage wildcard action", () => {
    expect(can("devices:update", ["devices:manage"])).toBe(true);
  });

  test("returns false for malformed permissions", () => {
    expect(can("devices:read", ["broken"])).toBe(false);
    expect(can("broken", ["devices:read"])).toBe(false);
  });
});
