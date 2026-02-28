import { describe, expect, test } from "vitest";
import { can } from "@/lib/permissions";

describe("permissions.can", () => {
  test("matches exact permission", () => {
    expect(can("displays:read", ["displays:read"])).toBe(true);
  });

  test("does not match different permission", () => {
    expect(can("displays:read", ["displays:update"])).toBe(false);
  });

  test("allows all permissions for root users", () => {
    expect(can("displays:update", [], true)).toBe(true);
  });

  test("returns false for malformed permissions", () => {
    expect(can("displays:read", ["broken" as never])).toBe(false);
    expect(can("broken" as never, ["displays:read"] as ["displays:read"])).toBe(
      false,
    );
  });
});
