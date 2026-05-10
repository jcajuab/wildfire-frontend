import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PendingInvitationsTable } from "./pending-invitations-table";
import { useRevealInviteLinkMutation } from "@/lib/api/invitations-api";
import type {
  InvitationRecord,
  InvitationSort,
  InvitationStatusFilter,
} from "@/types/invitation";

vi.mock("@/lib/api/invitations-api", () => ({
  useRevealInviteLinkMutation: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const useRevealInviteLinkMutationMock = vi.mocked(useRevealInviteLinkMutation);
const revealInviteLinkMock = vi.fn();
const writeTextMock = vi.fn();

function mockClipboard(): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    get: () => ({
      writeText: writeTextMock,
    }),
  });
}

const pendingInvite: InvitationRecord = {
  id: "invite-1",
  email: "student@example.com",
  name: "Student User",
  status: "pending",
  expiresAt: "2026-05-08T05:49:58.000Z",
  createdAt: "2026-05-07T05:49:58.000Z",
};

function renderTable(
  overrides: {
    readonly invitations?: readonly InvitationRecord[];
    readonly onResend?: (invitationId: string) => void;
    readonly resendingInvitationId?: string | null;
    readonly onStatusFilterChange?: (status: InvitationStatusFilter) => void;
    readonly onSortChange?: (sort: InvitationSort) => void;
  } = {},
) {
  const onResend = vi.fn();
  render(
    <PendingInvitationsTable
      invitations={overrides.invitations ?? [pendingInvite]}
      onResend={overrides.onResend ?? onResend}
      resendingInvitationId={overrides.resendingInvitationId}
      statusFilter="all"
      sort={{ field: "createdAt", direction: "desc" }}
      onStatusFilterChange={overrides.onStatusFilterChange}
      onSortChange={overrides.onSortChange}
    />,
  );
  return { onResend };
}

describe("PendingInvitationsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard();
    writeTextMock.mockResolvedValue(undefined);
    revealInviteLinkMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        inviteUrl: "https://example.com/accept-invite?token=abc",
      }),
    });
    useRevealInviteLinkMutationMock.mockReturnValue([
      revealInviteLinkMock,
    ] as unknown as ReturnType<typeof useRevealInviteLinkMutation>);
  });

  test("renders compact invitation columns without link, created, or visible action headers", () => {
    renderTable();

    expect(screen.getByRole("columnheader", { name: "Invitee" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Expires" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "text-right",
    );
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(row).toHaveClass("h-12");
    }
    expect(
      screen.queryByRole("columnheader", { name: "Link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Created" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Action" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeVisible();
    expect(screen.getByText("Student User")).toBeVisible();
    expect(screen.getByText("student@example.com").parentElement).toHaveClass(
      "min-h-8",
      "justify-center",
    );
    expect(screen.getByText(/May 08, 2026/)).toHaveClass("tabular-nums");
  });

  test("sorts invitee and expires columns and filters by status", async () => {
    const actor = userEvent.setup();
    const onSortChange = vi.fn();
    const onStatusFilterChange = vi.fn();

    renderTable({ onSortChange, onStatusFilterChange });

    await actor.click(
      screen.getByRole("button", { name: /Invitee.*sort ascending/ }),
    );
    expect(onSortChange).toHaveBeenCalledWith({
      field: "email",
      direction: "asc",
    });

    await actor.click(
      screen.getByRole("button", { name: /Expires.*sort ascending/ }),
    );
    expect(onSortChange).toHaveBeenCalledWith({
      field: "expiresAt",
      direction: "asc",
    });

    await actor.click(
      screen.getByRole("button", {
        name: "Filter invitations by status",
      }),
    );
    await actor.click(screen.getByRole("menuitemradio", { name: "Pending" }));

    expect(onStatusFilterChange).toHaveBeenCalledWith("pending");
  });

  test("copies invitation link from the dropdown", async () => {
    const actor = userEvent.setup();
    mockClipboard();
    renderTable();

    await actor.click(
      screen.getByRole("button", {
        name: "Actions for invitation to student@example.com",
      }),
    );
    await actor.click(
      screen.getByRole("menuitem", { name: "Copy Invite Link" }),
    );

    expect(revealInviteLinkMock).toHaveBeenCalledWith("invite-1");
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "https://example.com/accept-invite?token=abc",
      );
    });
  });

  test("regenerates pending invitation from the dropdown", async () => {
    const actor = userEvent.setup();
    const onResend = vi.fn();

    renderTable({ onResend });

    await actor.click(
      screen.getByRole("button", {
        name: "Actions for invitation to student@example.com",
      }),
    );
    await actor.click(
      screen.getByRole("menuitem", { name: "Regenerate Link" }),
    );

    expect(onResend).toHaveBeenCalledWith("invite-1");
  });

  test("hides row menu for non-pending invitations", () => {
    renderTable({
      invitations: [
        {
          ...pendingInvite,
          id: "invite-accepted",
          status: "accepted",
        },
      ],
    });

    const row = screen
      .getAllByRole("row")
      .find((candidate) =>
        candidate.textContent?.includes("student@example.com"),
      );

    expect(
      within(row as HTMLElement).queryByRole("button", {
        name: /Actions for invitation/,
      }),
    ).not.toBeInTheDocument();
  });

  test("shows regenerating state while invitation is being regenerated", async () => {
    const actor = userEvent.setup();
    renderTable({ resendingInvitationId: "invite-1" });

    await actor.click(
      screen.getByRole("button", {
        name: "Actions for invitation to student@example.com",
      }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Regenerating..." }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
