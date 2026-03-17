import { describe, expect, test } from "vitest";
import {
  formatPermissionId,
  formatPermissionReadableLabel,
  formatPermissionTooltipDescription,
} from "@/lib/format-permission";

describe("formatPermissionReadableLabel", () => {
  test("keeps stable action-first wording for core CRUD actions", () => {
    expect(
      formatPermissionReadableLabel({ resource: "content", action: "read" }),
    ).toBe("View Content");
    expect(
      formatPermissionReadableLabel({ resource: "roles", action: "create" }),
    ).toBe("Create Roles");
    expect(
      formatPermissionReadableLabel({ resource: "users", action: "update" }),
    ).toBe("Edit Users");
    expect(
      formatPermissionReadableLabel({ resource: "displays", action: "delete" }),
    ).toBe("Delete Displays");
  });

  test("keeps stable wildcard and fallback formatting", () => {
    expect(formatPermissionReadableLabel({ resource: "*", action: "*" })).toBe(
      "Manage all",
    );
    expect(
      formatPermissionReadableLabel({
        resource: "PLAYLISTS",
        action: "ARCHIVE",
      }),
    ).toBe("Archive Playlists");
  });
});

describe("formatPermissionId", () => {
  test("keeps stable raw resource:action identifiers", () => {
    expect(formatPermissionId({ resource: "roles", action: "read" })).toBe(
      "roles:read",
    );
    expect(formatPermissionId({ resource: "*", action: "*" })).toBe("*:*");
    expect(formatPermissionId({ resource: "Users", action: "READ" })).toBe(
      "Users:READ",
    );
  });
});

describe("formatPermissionTooltipDescription", () => {
  test("describes read permissions with two complete sentences", () => {
    expect(
      formatPermissionTooltipDescription({
        resource: "content",
        action: "read",
      }),
    ).toBe(
      "Allows users with this role to view content. This lets them access existing content data without changing it.",
    );
  });

  test("describes audit permissions with explicit system impact wording", () => {
    expect(
      formatPermissionTooltipDescription({ resource: "audit", action: "read" }),
    ).toBe(
      "Allows users with this role to view audit logs. This exposes a record of system activity for monitoring, investigations, and compliance checks.",
    );
  });

  test("describes wildcard management permission with full control language", () => {
    expect(
      formatPermissionTooltipDescription({ resource: "*", action: "*" }),
    ).toBe(
      "Allows users with this role to manage all resources. This includes full control over every permission-protected area of the system.",
    );
  });

  test("covers create, update, and delete actions with complete copy", () => {
    expect(
      formatPermissionTooltipDescription({
        resource: "roles",
        action: "create",
      }),
    ).toBe(
      "Allows users with this role to create roles. This lets them add new roles records that become available to other users.",
    );

    expect(
      formatPermissionTooltipDescription({
        resource: "users",
        action: "update",
      }),
    ).toBe(
      "Allows users with this role to edit users. This lets them change existing users records and alter what others see.",
    );

    expect(
      formatPermissionTooltipDescription({
        resource: "displays",
        action: "delete",
      }),
    ).toBe(
      "Allows users with this role to delete displays. This lets them remove displays records and can permanently affect availability.",
    );
  });

  test("always returns at least two sentences", () => {
    const description = formatPermissionTooltipDescription({
      resource: "playlists",
      action: "read",
    });

    const sentenceMatches = description.match(/[^.!?]+[.!?]/g) ?? [];
    expect(sentenceMatches.length).toBeGreaterThanOrEqual(2);
  });
});
