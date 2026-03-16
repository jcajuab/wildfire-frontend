"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconPlus, IconCopy, IconCheck } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { DashboardPage } from "@/components/layout/dashboard-page";
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
import { PAGE_SIZE, useUsersPage } from "./use-users-page";

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

export default function UsersPage(): ReactElement {
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
    usersError,
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
  } = useUsersPage();

  if (usersLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Users" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-muted-foreground">Loading users…</p>
            </div>
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
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                Failed to load users. Check the API and try again.
              </p>
            </div>
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
        <DashboardPage.Content>
          <div className="shrink-0 border-b border-border bg-muted/15 px-6 py-3 sm:px-8">
            <h2 className="text-base font-semibold">Search Results</h2>
            <SearchControl
              value={search}
              onChange={handleSearchChange}
              ariaLabel="Search users"
              placeholder="Search users…"
              className="w-full max-w-none md:w-72"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {users.length === 0 ? (
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
              <div className="overflow-hidden rounded-md border border-border">
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
            )}

            <Can permission="users:create">
              <section className="overflow-hidden rounded-md border border-border">
                <div className="border-b border-border px-4 py-3">
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
                  onSendInvitation={() => setIsInviteDialogOpen(true)}
                />
              </section>
            </Can>
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={usersData?.total ?? 0}
            onPageChange={setPage}
            variant="numbered"
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
          if (userToBan.bannedAt) {
            await unbanUserById(userToBan.id);
          } else {
            await banUserById(userToBan.id);
          }
          setUserToBan(null);
        }}
      />

      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        password={resetPasswordResult?.password ?? ""}
        onOpenChange={setIsResetPasswordDialogOpen}
      />
    </DashboardPage.Root>
  );
}
