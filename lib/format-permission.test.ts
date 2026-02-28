import { describe, expect, test } from "vitest";
import { formatPermissionTooltipDescription } from "@/lib/format-permission";

describe("formatPermissionTooltipDescription", () => {
  test("describes read permissions with user-friendly wording", () => {
    expect(
      formatPermissionTooltipDescription({
        resource: "content",
        action: "read",
      }),
    ).toBe("Allows users with this role to view content.");
  });

  test("describes audit permissions as audit logs", () => {
    expect(
      formatPermissionTooltipDescription({ resource: "audit", action: "read" }),
    ).toBe("Allows users with this role to view audit logs.");
  });

  test("describes wildcard management permission", () => {
    expect(
      formatPermissionTooltipDescription({ resource: "*", action: "*" }),
    ).toBe("Allows users with this role to manage all resources.");
  });
});
