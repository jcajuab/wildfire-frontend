import { describe, expect, test } from "vitest";
import { can as canPermission } from "@/lib/permissions";
import {
  getFirstPermittedAdminRoute,
  getRequiredReadPermission,
} from "@/lib/route-permissions";

describe("getRequiredReadPermission", () => {
  test("returns playlist create for the dedicated create route", () => {
    expect(getRequiredReadPermission("/admin/playlists/create")).toBe(
      "playlists:create",
    );
  });

  test("keeps playlist index on the read permission", () => {
    expect(getRequiredReadPermission("/admin/playlists")).toBe(
      "playlists:read",
    );
  });
});

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

  test("returns the first route when all permissions are allowed", () => {
    const actual = getFirstPermittedAdminRoute(() => true);
    expect(actual).toBe("/admin/displays");
  });

  test("returns null when no read permissions are allowed", () => {
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
