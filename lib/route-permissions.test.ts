import { describe, expect, test } from "vitest";
import { can as canPermission } from "@/lib/permissions";
import {
  getFirstVisibleAdminRoute,
  getFirstPermittedAdminRoute,
  getRequiredReadPermission,
  getRequiredReadPermissions,
  getRoutesBySection,
  isSidebarRouteVisible,
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

  test("keeps content index on the read permission", () => {
    expect(getRequiredReadPermission("/admin/content")).toBe("content:read");
  });

  test("requires display create and update for display group management", () => {
    expect(
      getRequiredReadPermissions("/admin/displays/display-groups"),
    ).toEqual(["displays:create", "displays:update"]);
  });

  test("keeps role index on the read permission", () => {
    expect(getRequiredReadPermission("/admin/roles")).toBe("roles:read");
  });

  test("returns role create for the dedicated create route", () => {
    expect(getRequiredReadPermission("/admin/roles/create")).toBe(
      "roles:create",
    );
  });

  test("returns role update for edit child routes", () => {
    expect(getRequiredReadPermission("/admin/roles/edit/role-123")).toBe(
      "roles:update",
    );
  });
});

describe("sidebar route visibility", () => {
  test("requires content read and create permissions for the content nav item", () => {
    const contentEntry = getRoutesBySection("core").find(
      (entry) => entry.path === "/admin/content",
    );

    if (contentEntry == null) {
      throw new Error("Missing content route entry");
    }

    expect(
      isSidebarRouteVisible(
        contentEntry,
        (permission) => permission === "content:read",
      ),
    ).toBe(false);
    expect(
      isSidebarRouteVisible(contentEntry, (permission) =>
        ["content:read", "content:create"].includes(permission),
      ),
    ).toBe(true);
  });

  test("requires playlist read and create permissions for the playlists nav item", () => {
    const playlistsEntry = getRoutesBySection("core").find(
      (entry) => entry.path === "/admin/playlists",
    );

    if (playlistsEntry == null) {
      throw new Error("Missing playlists route entry");
    }

    expect(
      isSidebarRouteVisible(
        playlistsEntry,
        (permission) => permission === "playlists:read",
      ),
    ).toBe(false);
    expect(
      isSidebarRouteVisible(playlistsEntry, (permission) =>
        ["playlists:read", "playlists:create"].includes(permission),
      ),
    ).toBe(true);
  });

  test("returns the first visible route using sidebar visibility permissions", () => {
    const actual = getFirstVisibleAdminRoute((permission) =>
      ["content:read", "playlists:read", "playlists:create"].includes(
        permission,
      ),
    );

    expect(actual).toBe("/admin/playlists");
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
