"use client";

import type { ReactElement } from "react";
import { useLayoutEffect, useState } from "react";
import { IconPlus, IconCopy, IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { SearchControl } from "@/components/common/search-control";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { UsersTable } from "@/components/users/users-table";
import { PendingInvitationsTable } from "@/components/users/pending-invitations-table";
import {
  rbacApi,
  type RbacRoleSummary,
  type RbacUserListQuery,
  type RbacUsersListResponse,
} from "@/lib/api/rbac-api";
import { useAppDispatch } from "@/lib/hooks";
import { PAGE_SIZE, useUsersPage } from "./_hooks/use-users-page";

export function UsersListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: RbacUserListQuery;
  readonly data: RbacUsersListResponse;
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(rbacApi.util.upsertQueryData("getUsers", queryArgs, data));
  }, [dispatch, queryArgs, data]);
  return null;
}

export function RoleOptionsCacheSeeder({
  data,
}: {
  readonly data: readonly RbacRoleSummary[];
}): null {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    dispatch(
      rbacApi.util.upsertQueryData("getRoleOptions", undefined, [...data]),
    );
  }, [dispatch, data]);
  return null;
}

function ResetPasswordDialog({
  open,
  password,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly password: string;
  readonly onOpenChange: (open: boolean) => void;
}): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password Reset</DialogTitle>
          <DialogDescription>
            The user&apos;s password has been reset. Share this temporary
            password with them securely. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
          <code className="flex-1 font-mono text-sm">{password}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label="Copy password"
          >
            {copied ? (
              <IconCheck className="size-4 text-green-600" />
            ) : (
              <IconCopy className="size-4" />
            )}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPageView(): ReactElement {
  const {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    search,
    page,
    sort,
    users,
    usersData,
    availableRoles,
    userRolesByUserId,
    systemRoleIds,
    usersLoading,
    usersFetching,
    usersError,
    isRoleToggling,
    invitations,
    isInvitationsLoading,
    resendingInvitationId,
    isInviteDialogOpen,
    isEditDialogOpen,
    selectedUser,
    userToBan,
    isBanDialogOpen,
    resetPasswordResult,
    isResetPasswordDialogOpen,
    setPage,
    setIsInviteDialogOpen,
    setIsEditDialogOpen,
    setIsBanDialogOpen,
    setUserToBan,
    setIsResetPasswordDialogOpen,
    handleSearchChange,
    handleSortChange,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEdit,
    handleEditSubmit,
    handleRequestBanUser,
    handleRequestUnbanUser,
    handleResetPassword,
    banUserById,
    unbanUserById,
    refreshUsers,
  } = useUsersPage();

  if (usersLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Users" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Loading users...
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Users" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                Failed to load users. Check the API and try again.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Users">
        <Can permission="users:create">
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <IconPlus className="size-4" />
            Invite User
          </Button>
        </Can>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Search Results</h2>
              <SearchControl
                value={search}
                onChange={handleSearchChange}
                ariaLabel="Search users"
                placeholder="Search..."
                className="w-full max-w-none sm:w-72"
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {users.length === 0 && !usersFetching ? (
              <EmptyState
                title="No users yet"
                description="Invite users to give them access to WILDFIRE."
                action={
                  <Can permission="users:create">
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                      <IconPlus className="size-4" />
                      Invite User
                    </Button>
                  </Can>
                }
              />
            ) : (
              <div className="relative min-h-0 flex-1 flex flex-col overflow-hidden rounded-md border border-border">
                {usersFetching && !usersLoading && !isRoleToggling ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                    <div className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-sm text-muted-foreground">
                        Searching for users...
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <UsersTable
                    users={users}
                    availableRoles={availableRoles}
                    userRolesByUserId={userRolesByUserId}
                    sort={sort}
                    onSortChange={handleSortChange}
                    onEdit={handleEdit}
                    onRoleToggle={handleRoleToggle}
                    onBanUser={handleRequestBanUser}
                    onUnbanUser={handleRequestUnbanUser}
                    onResetPassword={handleResetPassword}
                    canUpdate={canUpdateUser}
                    canDelete={canDeleteUser}
                    isSuperAdmin={isAdmin}
                    systemRoleIds={systemRoleIds}
                    currentUserId={currentUser?.id}
                  />
                </div>
              </div>
            )}

            <Can permission="users:create">
              <section className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-md border border-border">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Invitations</h3>
                  <p className="text-xs text-muted-foreground">
                    Recent invitation status and expiration timestamps.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PendingInvitationsTable
                    invitations={invitations}
                    isLoading={isInvitationsLoading}
                    resendingInvitationId={resendingInvitationId}
                    onResend={handleResendInvitation}
                    onSendInvitation={() => setIsInviteDialogOpen(true)}
                  />
                </div>
              </section>
            </Can>
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={usersData?.total ?? 0}
            onPageChange={setPage}
            variant="numbered"
          />
        </footer>
      </section>

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
        open={isBanDialogOpen}
        onOpenChange={setIsBanDialogOpen}
        title={userToBan?.bannedAt ? "Unban user?" : "Ban user?"}
        description={
          userToBan
            ? userToBan.bannedAt
              ? `This will restore ${userToBan.name}'s access to WILDFIRE.`
              : `This will suspend ${userToBan.name}'s access to WILDFIRE.`
            : undefined
        }
        confirmLabel={userToBan?.bannedAt ? "Unban user" : "Ban user"}
        errorFallback={
          userToBan?.bannedAt ? "Failed to unban user" : "Failed to ban user"
        }
        onConfirm={async () => {
          if (!userToBan) return;
          const { id, username, bannedAt } = userToBan;
          if (bannedAt) {
            await unbanUserById(id);
            toast.success(`Successfully unbanned ${username}`);
          } else {
            await banUserById(id);
            toast.success(`Successfully banned ${username}`);
          }
          setUserToBan(null);
          refreshUsers();
        }}
      />

      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        password={resetPasswordResult?.password ?? ""}
        onOpenChange={setIsResetPasswordDialogOpen}
      />
    </div>
  );
}
