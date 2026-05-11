import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { UsersPageView } from "./users-page-client";
import {
  PAGE_SIZE,
  useUsersPage,
  type UseUsersPageResult,
} from "./_hooks/use-users-page";
import type { User } from "@/types/user";

vi.mock("@/components/common/can", () => ({
  Can: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/users/invite-users-dialog", () => ({
  InviteUsersDialog: () => null,
}));

vi.mock("@/components/users/edit-user-dialog", () => ({
  EditUserDialog: () => null,
}));

vi.mock("@/components/common/confirm-action-dialog", () => ({
  ConfirmActionDialog: () => null,
}));

vi.mock("@/components/users/users-table", () => ({
  UsersTable: ({ users }: { readonly users: readonly User[] }) => (
    <table>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("@/components/users/pending-invitations-table", () => ({
  PendingInvitationsTable: ({
    invitations,
  }: {
    readonly invitations: readonly { id: string; email: string }[];
  }) => (
    <div>
      {invitations.length === 0
        ? "No invitations yet"
        : invitations.map((invite) => <p key={invite.id}>{invite.email}</p>)}
    </div>
  ),
}));

vi.mock("./_hooks/use-users-page", () => ({
  PAGE_SIZE: 30,
  useUsersPage: vi.fn(),
}));

const useUsersPageMock = vi.mocked(useUsersPage);
const handleSearchChangeMock = vi.fn();
const handleInvitationSearchChangeMock = vi.fn();
const setActiveTabMock = vi.fn();

const user: User = {
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  name: "Alice",
  isActive: true,
  roles: [],
  lastSeenAt: null,
};

function makePageResult(
  overrides: Partial<UseUsersPageResult> = {},
): UseUsersPageResult {
  return {
    currentUser: { id: "admin", name: "Admin", isAdmin: true },
    isAdmin: true,
    canUpdateUser: true,
    canDeleteUser: true,
    canCreateUser: true,
    search: "",
    roleId: "all",
    userType: "all",
    page: 1,
    invitationSearch: "",
    invitationPage: 1,
    invitationStatusFilter: "all",
    activeTab: "users",
    sort: { field: "name", direction: "asc" },
    invitationSort: { field: "createdAt", direction: "desc" },
    users: [user],
    usersData: {
      items: [],
      total: PAGE_SIZE,
      page: 1,
      pageSize: PAGE_SIZE,
    },
    availableRoles: [],
    userRolesByUserId: {},
    systemRoleIds: [],
    usersLoading: false,
    usersFetching: false,
    usersError: false,
    isRoleToggling: false,
    invitations: [
      {
        id: "invite-1",
        email: "new@example.com",
        name: null,
        status: "pending",
        expiresAt: "2026-05-08T00:00:00.000Z",
        createdAt: "2026-05-07T00:00:00.000Z",
      },
    ],
    invitationsData: {
      items: [
        {
          id: "invite-1",
          email: "new@example.com",
          name: null,
          status: "pending",
          expiresAt: "2026-05-08T00:00:00.000Z",
          createdAt: "2026-05-07T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: PAGE_SIZE,
    },
    isInvitationsLoading: false,
    resendingInvitationId: null,
    isInviteDialogOpen: false,
    isEditDialogOpen: false,
    selectedUser: null,
    userToBan: null,
    isBanDialogOpen: false,
    resetPasswordResult: null,
    isResetPasswordDialogOpen: false,
    setPage: vi.fn(),
    setInvitationPage: vi.fn(),
    setActiveTab: setActiveTabMock,
    setIsInviteDialogOpen: vi.fn(),
    setIsEditDialogOpen: vi.fn(),
    setIsBanDialogOpen: vi.fn(),
    setUserToBan: vi.fn(),
    setIsResetPasswordDialogOpen: vi.fn(),
    handleSearchChange: handleSearchChangeMock,
    handleInvitationSearchChange: handleInvitationSearchChangeMock,
    handleSortChange: vi.fn(),
    handleRoleFilterChange: vi.fn(),
    handleUserTypeFilterChange: vi.fn(),
    handleInvitationStatusFilterChange: vi.fn(),
    handleInvitationSortChange: vi.fn(),
    handleInvite: vi.fn(),
    handleResendInvitation: vi.fn(),
    handleRoleToggle: vi.fn(),
    handleEdit: vi.fn(),
    handleEditSubmit: vi.fn(),
    handleRequestBanUser: vi.fn(),
    handleRequestUnbanUser: vi.fn(),
    handleResetPassword: vi.fn(),
    banUserById: vi.fn(),
    unbanUserById: vi.fn(),
    ...overrides,
  };
}

describe("UsersPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUsersPageMock.mockReturnValue(makePageResult());
  });

  test("renders users tab by default with users-only search", () => {
    render(<UsersPageView />);

    expect(
      screen.getByRole("tablist", { name: "Users page sections" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Users" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByPlaceholderText("Search by name, username, or email"),
    ).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Users" })).toHaveLength(1);
    expect(
      screen.getByText(`Showing 1 to ${PAGE_SIZE} of ${PAGE_SIZE} results`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("switches to invitations tab with invitation search", () => {
    useUsersPageMock.mockReturnValue(
      makePageResult({ activeTab: "invitations" }),
    );

    render(<UsersPageView />);

    expect(screen.getByRole("tab", { name: "Invitations" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByPlaceholderText("Search by name, username, or email"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by invitee"),
    ).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 to 1 of 1 results")).toBeInTheDocument();
  });

  test("hides invitations tab when user cannot create users", () => {
    useUsersPageMock.mockReturnValue(
      makePageResult({ activeTab: "invitations", canCreateUser: false }),
    );

    render(<UsersPageView />);

    expect(
      screen.queryByRole("tab", { name: "Invitations" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by name, username, or email"),
    ).toBeInTheDocument();
    expect(setActiveTabMock).toHaveBeenCalledWith("users");
  });

  test("updates users search through the existing handler", async () => {
    const actor = userEvent.setup();
    render(<UsersPageView />);

    await actor.type(
      screen.getByPlaceholderText("Search by name, username, or email"),
      "bob",
    );

    expect(handleSearchChangeMock).toHaveBeenCalledWith("b");
    expect(handleSearchChangeMock).toHaveBeenCalledWith("o");
    expect(handleSearchChangeMock).toHaveBeenCalledWith("b");
  });

  test("updates invitations search through the invitation handler", async () => {
    const actor = userEvent.setup();
    useUsersPageMock.mockReturnValue(
      makePageResult({ activeTab: "invitations" }),
    );
    render(<UsersPageView />);

    await actor.type(screen.getByPlaceholderText("Search by invitee"), "usc");

    expect(handleInvitationSearchChangeMock).toHaveBeenCalledWith("u");
    expect(handleInvitationSearchChangeMock).toHaveBeenCalledWith("s");
    expect(handleInvitationSearchChangeMock).toHaveBeenCalledWith("c");
  });
});
