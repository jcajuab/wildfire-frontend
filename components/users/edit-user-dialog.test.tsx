import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import type { User } from "@/types/user";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "admin-user" },
  }),
}));

const baseUser: User = {
  id: "user-1",
  name: "Alice Example",
  username: "alice",
  email: "alice@example.com",
  isActive: true,
  isInvitedUser: false,
  roles: [],
};

function renderDialog(user: User = baseUser) {
  return render(
    <TooltipProvider>
      <EditUserDialog
        user={user}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        canManageStatus
      />
    </TooltipProvider>,
  );
}

describe("EditUserDialog", () => {
  test("shows user type as a read-only form field", () => {
    renderDialog();

    expect(screen.getByLabelText("User Type")).toHaveValue("DCISM");
    expect(screen.getByLabelText("User Type")).toHaveAttribute(
      "aria-readonly",
      "true",
    );
  });

  test("locks DCISM username editing without inline helper copy", () => {
    renderDialog();

    expect(screen.getByLabelText("Username")).toBeDisabled();
    expect(
      screen.queryByText("Username is managed by DCISM and cannot be changed."),
    ).not.toBeInTheDocument();
  });

  test("marks banned users in the read-only user type field", () => {
    renderDialog({
      ...baseUser,
      isActive: false,
      bannedAt: "2026-05-11T00:00:00.000Z",
    });

    expect(screen.getByLabelText("User Type")).toHaveValue("Banned");
    expect(
      screen.getByRole("button", { name: "Unban User" }),
    ).toBeInTheDocument();
  });
});
