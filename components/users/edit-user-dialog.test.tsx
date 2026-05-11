import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      />
    </TooltipProvider>,
  );
}

describe("EditUserDialog", () => {
  test("shows user type as a read-only form field", () => {
    renderDialog();

    const userType = screen.getByLabelText("User Type");
    expect(userType).toHaveValue("DCISM");
    expect(userType).toBeDisabled();
    expect(userType).toBeInstanceOf(HTMLInputElement);
  });

  test("marks invited users in the read-only user type field", () => {
    renderDialog({
      ...baseUser,
      isInvitedUser: true,
    });

    expect(screen.getByLabelText("User Type")).toHaveValue("Invited");
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
      screen.queryByRole("button", { name: "Unban User" }),
    ).not.toBeInTheDocument();
  });

  test("orders editable fields before the disabled user type field", () => {
    renderDialog();

    const labels = screen
      .getAllByText(/^(Name|Username|Email|User Type)\*?$/)
      .map((label) => label.textContent);

    expect(labels).toEqual(["Name", "Username", "Email", "User Type"]);
    expect(screen.queryByText("Role Assignment")).not.toBeInTheDocument();
  });

  test("keeps dialog scoped to user info and form completion actions", () => {
    renderDialog();

    expect(
      screen.queryByRole("button", { name: "Reset Password" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ban User" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete User" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("submits only identity details", async () => {
    const actor = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TooltipProvider>
        <EditUserDialog
          user={{
            ...baseUser,
            isInvitedUser: true,
          }}
          open
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
        />
      </TooltipProvider>,
    );

    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: "user-1",
      username: "alice",
      name: "Alice Example",
      email: "alice@example.com",
    });
  });
});
