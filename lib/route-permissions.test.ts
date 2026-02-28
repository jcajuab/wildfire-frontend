import { describe, expect, test } from "vitest";
import { getFirstPermittedAdminRoute } from "@/lib/route-permissions";

describe("route-permissions.getFirstPermittedAdminRoute", () => {
  test("returns default dashboard route when permitted", () => {
    expect(getFirstPermittedAdminRoute(["displays:read"])).toBe(
      "/admin/displays",
    );
  });

  test("returns first route by configured priority", () => {
    expect(getFirstPermittedAdminRoute(["users:read", "audit:read"])).toBe(
      "/admin/users",
    );
  });

  test("returns logs when it is the only permitted module", () => {
    expect(getFirstPermittedAdminRoute(["audit:read"])).toBe("/admin/logs");
  });

  test("returns null when no route is permitted", () => {
    expect(getFirstPermittedAdminRoute([])).toBeNull();
  });

  test("returns default route for root users", () => {
    expect(getFirstPermittedAdminRoute([], true)).toBe("/admin/displays");
  });
});
