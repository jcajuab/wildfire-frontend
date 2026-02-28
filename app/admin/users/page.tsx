"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { UserSearchInput } from "@/components/users/user-search-input";
import { UsersPagination } from "@/components/users/users-pagination";
import { UsersTable } from "@/components/users/users-table";
import { PendingInvitationsTable } from "@/components/users/pending-invitations-table";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  AuthApiError,
  createInvitation,
  type CreateInvitationResponse,
  getInvitations,
  resendInvitation,
} from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useLazyGetUserRolesQuery,
  useGetUsersQuery,
  useGetRolesQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useSetUserRolesMutation,
} from "@/lib/api/rbac-api";
import type { EditUserFormData } from "@/components/users/edit-user-dialog";
import type {
  User,
  UserRole,
  UserSort,
  UserSortDirection,
  UserSortField,
} from "@/types/user";
import type { InvitationRecord } from "@/types/invitation";

const USER_SORT_FIELDS = ["name", "lastSeen"] as const;
const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
const HIGH_RISK_TARGET_THRESHOLD = 20;

interface PendingRoleUpdate {
  readonly userId: string;
  readonly roleIds: string[];
}

export default function UsersPage(): ReactElement {
  const { user: currentUser } = useAuth();
  const canUpdateUser = useCan("users:update");
  const canDeleteUser = useCan("users:delete");
  const canCreateUser = useCan("users:create");
  const canReadRoles = useCan("roles:read");
  const isRoot = currentUser?.isRoot === true;
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery(undefined, {
    skip: !canReadRoles,
  });
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const [search, setSearch] = useQueryStringState("q", "");
  const [sortField, setSortField] = useQueryEnumState<UserSortField>(
    "sortField",
    "name",
    USER_SORT_FIELDS,
  );
  const [sortDirection, setSortDirection] =
    useQueryEnumState<UserSortDirection>(
      "sortDir",
      "asc",
      USER_SORT_DIRECTIONS,
    );
  const [page, setPage] = useQueryNumberState("page", 1);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(false);
  const [invitations, setInvitations] = useState<readonly InvitationRecord[]>(
    [],
  );
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);
  const [userRolesByUserId, setUserRolesByUserId] = useState<
    Readonly<Record<string, readonly UserRole[]>>
  >({});
  const [pendingRoleUpdate, setPendingRoleUpdate] =
    useState<PendingRoleUpdate | null>(null);
  const [policyVersionInput, setPolicyVersionInput] = useState("");
  const [policyVersionError, setPolicyVersionError] = useState<string | null>(
    null,
  );
  const [isPolicyVersionSubmitting, setIsPolicyVersionSubmitting] =
    useState(false);

  const pageSize = 10;

  const sort = useMemo<UserSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

  const users: User[] = useMemo(
    () =>
      (usersData ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        lastSeenAt: user.lastSeenAt ?? null,
        avatarUrl: user.avatarUrl ?? null,
      })),
    [usersData],
  );
  const availableRoles = useMemo(() => {
    const roles = rolesData ?? [];
    const filtered = isRoot ? roles : roles.filter((role) => !role.isSystem);
    return filtered.map((role) => ({ id: role.id, name: role.name }));
  }, [rolesData, isRoot]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleSortChange = useCallback(
    (nextSort: UserSort) => {
      setSortField(nextSort.field);
      setSortDirection(nextSort.direction);
      setPage(1);
    },
    [setSortField, setSortDirection, setPage],
  );

  const handleInvite = useCallback(async (emails: readonly string[]) => {
    try {
      const results = await Promise.allSettled(
        emails.map((email) => createInvitation({ email })),
      );

      const failedInvites = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );

      if (failedInvites.length > 0) {
        const firstError = failedInvites[0]?.reason;
        const details =
          firstError instanceof Error ? `: ${firstError.message}` : "";
        throw new Error(
          `${failedInvites.length} of ${emails.length} invites failed${details}`,
        );
      }

      const firstSuccess = results.find(
        (result): result is PromiseFulfilledResult<CreateInvitationResponse> =>
          result.status === "fulfilled",
      );
      if (firstSuccess?.value.inviteUrl) {
        toast.success(
          "Invitations created. Dev invite URL available in response.",
        );
      } else {
        toast.success("Invitations created successfully.");
      }

      setIsInviteDialogOpen(false);
      const latestInvitations = await getInvitations();
      setInvitations(latestInvitations);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        toast.error("Too many invite requests. Please wait and try again.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Failed to invite user(s)"));
    }
  }, []);

  const loadInvitations = useCallback(async (): Promise<void> => {
    if (!canCreateUser) {
      setInvitations([]);
      return;
    }

    setIsInvitationsLoading(true);
    try {
      const list = await getInvitations();
      setInvitations(list);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load invitations"));
    } finally {
      setIsInvitationsLoading(false);
    }
  }, [canCreateUser]);

  const handleResendInvitation = useCallback(async (id: string) => {
    setResendingInvitationId(id);
    try {
      const result = await resendInvitation(id);
      if (result.inviteUrl) {
        toast.success(
          "Invitation resent. Dev invite URL available in response.",
        );
      } else {
        toast.success("Invitation resent.");
      }
      const latestInvitations = await getInvitations();
      setInvitations(latestInvitations);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to resend invite"));
    } finally {
      setResendingInvitationId(null);
    }
  }, []);

  const systemRoleIds = useMemo(
    () => (rolesData ?? []).filter((r) => r.isSystem).map((r) => r.id),
    [rolesData],
  );

  const applyUserRoles = useCallback(
    async (payload: {
      userId: string;
      roleIds: string[];
      policyVersion?: number;
    }): Promise<void> => {
      const roles = await setUserRoles(payload).unwrap();
      setUserRolesByUserId((prev) => ({
        ...prev,
        [payload.userId]: roles.map((role) => ({
          id: role.id,
          name: role.name,
        })),
      }));
    },
    [setUserRoles],
  );

  const handleRoleToggle = useCallback(
    (userId: string, newRoleIds: string[]) => {
      const roleIdsToSend = isRoot
        ? newRoleIds
        : (() => {
            const currentIds =
              userRolesByUserId[userId]?.map((r) => r.id) ?? [];
            const preservedSystem = currentIds.filter((id) =>
              systemRoleIds.includes(id),
            );
            return [...new Set([...newRoleIds, ...preservedSystem])];
          })();

      if (roleIdsToSend.length > HIGH_RISK_TARGET_THRESHOLD) {
        setPendingRoleUpdate({
          userId,
          roleIds: roleIdsToSend,
        });
        setPolicyVersionInput("");
        return;
      }

      void applyUserRoles({
        userId,
        roleIds: roleIdsToSend,
      }).catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to update user roles"));
      });
    },
    [applyUserRoles, isRoot, systemRoleIds, userRolesByUserId],
  );

  const parsedPolicyVersion = Number.parseInt(policyVersionInput, 10);
  const isPolicyVersionValid =
    Number.isInteger(parsedPolicyVersion) && parsedPolicyVersion > 0;

  const clearPendingRoleUpdate = useCallback((): void => {
    setPendingRoleUpdate(null);
    setPolicyVersionInput("");
    setPolicyVersionError(null);
  }, []);

  const handlePolicyVersionSubmit = useCallback(async (): Promise<void> => {
    if (!pendingRoleUpdate) return;
    setPolicyVersionError(null);
    if (!isPolicyVersionValid) {
      setPolicyVersionError("Policy version must be a positive whole number.");
      return;
    }

    setIsPolicyVersionSubmitting(true);
    try {
      await applyUserRoles({
        ...pendingRoleUpdate,
        policyVersion: parsedPolicyVersion,
      });
      clearPendingRoleUpdate();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update user roles"));
    } finally {
      setIsPolicyVersionSubmitting(false);
    }
  }, [
    applyUserRoles,
    clearPendingRoleUpdate,
    isPolicyVersionValid,
    pendingRoleUpdate,
    parsedPolicyVersion,
  ]);

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: EditUserFormData) => {
      try {
        await updateUser({
          id: data.id,
          name: data.name,
          email: data.email,
          isActive: data.isActive,
        }).unwrap();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to update user"));
      }
    },
    [updateUser],
  );

  const handleRequestRemoveUser = useCallback((user: User) => {
    setUserToRemove(user);
    setIsRemoveDialogOpen(true);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "lastSeen":
          const aDate = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
          const bDate = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
          return (aDate - bDate) * direction;
        default:
          return 0;
      }
    });
  }, [filteredUsers, sort]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page]);

  useEffect(() => {
    let cancelled = false;
    if (paginatedUsers.length === 0) return () => undefined;

    async function loadVisibleUserRoles(): Promise<void> {
      const entries = await Promise.all(
        paginatedUsers.map(async (user) => {
          try {
            const roles = await getUserRolesTrigger(user.id, true).unwrap();
            return [
              user.id,
              roles.map((role) => ({ id: role.id, name: role.name })),
            ] as const;
          } catch {
            return [user.id, []] as const;
          }
        }),
      );

      if (cancelled) return;
      setUserRolesByUserId((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    }

    void loadVisibleUserRoles();

    return () => {
      cancelled = true;
    };
  }, [getUserRolesTrigger, paginatedUsers]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  if (usersLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading users…</p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  if (usersError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-destructive">
              Failed to load users. Check the API and try again.
            </p>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  return (
    <DashboardPage.Root>
      <DashboardPage.Header
        title="Users"
        actions={
          <Can permission="users:create">
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <IconPlus className="size-4" />
              Invite User
            </Button>
          </Can>
        }
      />

      <DashboardPage.Body>
        <DashboardPage.Toolbar>
          <h2 className="text-base font-semibold">Search Results</h2>
          <UserSearchInput
            value={search}
            onChange={handleSearchChange}
            className="w-full max-w-none md:w-72"
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <div className="overflow-hidden rounded-lg border">
            <UsersTable
              users={paginatedUsers}
              availableRoles={availableRoles}
              userRolesByUserId={userRolesByUserId}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onRoleToggle={handleRoleToggle}
              onRemoveUser={handleRequestRemoveUser}
              canUpdate={canUpdateUser}
              canDelete={canDeleteUser}
              isSuperAdmin={isRoot}
              systemRoleIds={systemRoleIds}
              currentUserId={currentUser?.id}
            />
          </div>

          <Can permission="users:create">
            <section className="mt-6 overflow-hidden rounded-lg border">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Invitations</h3>
                <p className="text-xs text-muted-foreground">
                  Recent invitation status and expiration timestamps.
                </p>
              </div>
              <PendingInvitationsTable
                invitations={invitations}
                isLoading={isInvitationsLoading}
                resendingInvitationId={resendingInvitationId}
                onResend={handleResendInvitation}
              />
            </section>
          </Can>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <UsersPagination
            page={page}
            pageSize={pageSize}
            total={sortedUsers.length}
            onPageChange={setPage}
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <InviteUsersDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInvite={handleInvite}
      />

      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
      />

      <ConfirmActionDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        title="Remove user?"
        description={
          userToRemove
            ? `This will permanently remove "${userToRemove.name}".`
            : undefined
        }
        confirmLabel="Remove user"
        onConfirm={async () => {
          if (!userToRemove) return;
          try {
            await deleteUser(userToRemove.id).unwrap();
            setUserToRemove(null);
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to remove user"));
            throw err;
          }
        }}
      />

      <Dialog
        open={pendingRoleUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            clearPendingRoleUpdate();
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Policy-gated role update</DialogTitle>
            <DialogDescription>
              Assigning a large number of roles requires a policy version for
              auditability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="policy-version">Policy version</Label>
            <Input
              id="policy-version"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={policyVersionInput}
              onChange={(event) => setPolicyVersionInput(event.target.value)}
              autoFocus
              placeholder="Enter a positive integer"
            />
            <p className="text-xs text-muted-foreground">
              Example: enter the current policy change number used by your
              governance process.
            </p>
            {policyVersionError ? (
              <p className="text-xs text-destructive">{policyVersionError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                clearPendingRoleUpdate();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handlePolicyVersionSubmit()}
              disabled={isPolicyVersionSubmitting || !isPolicyVersionValid}
            >
              {isPolicyVersionSubmitting ? "Updating…" : "Apply with version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPage.Root>
  );
}
