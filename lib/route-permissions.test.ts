import { describe, expect, test } from "vitest";
import { can as canPermission } from "@/lib/permissions";
import { getFirstPermittedAdminRoute } from "@/lib/route-permissions";

describe("getFirstPermittedAdminRoute", () => {
  test("returns first route when the first permission is available", () => {
    const actual = getFirstPermittedAdminRoute(
      (permission) => permission === "displays:read",
    );
    expect(actual).toBe("/admin/displays");
  });

  test("falls back to the next available route in priority order", () => {
    const actual = getFirstPermittedAdminRoute(
      (permission) => permission === "audit:read",
    );
    expect(actual).toBe("/admin/logs");
  });

  test("returns the single permitted route", () => {
    const actual = getFirstPermittedAdminRoute(
      (permission) => permission === "settings:read",
    );
    expect(actual).toBe("/admin/settings");
  });

  test("returns null when no route is permitted", () => {
    const actual = getFirstPermittedAdminRoute(() => false);
    expect(actual).toBeNull();
  });

  test("returns first route for root-style permission logic", () => {
    const actual = getFirstPermittedAdminRoute((permission) =>
      canPermission(permission, [], true),
    );
    expect(actual).toBe("/admin/displays");
  });
});
