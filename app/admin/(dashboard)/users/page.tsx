"use client";

import type { ReactElement } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { InviteUsersDialog } from "@/components/users/invite-users-dialog";
import { SearchControl } from "@/components/common/search-control";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { UsersTable } from "@/components/users/users-table";
import { PendingInvitationsTable } from "@/components/users/pending-invitations-table";
import { PAGE_SIZE, useUsersPage } from "./use-users-page";

export default function UsersPage(): ReactElement {
  const {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    canCreateUser,
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
    userToRemove,
    isRemoveDialogOpen,
    setPage,
    setIsInviteDialogOpen,
    setIsEditDialogOpen,
    setIsRemoveDialogOpen,
    setUserToRemove,
    handleSearchChange,
    handleSortChange,
    handleInvite,
    handleResendInvitation,
    handleRoleToggle,
    handleEdit,
    handleEditSubmit,
    handleRequestRemoveUser,
    deleteUser,
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
            <div className="overflow-hidden rounded-md border border-border">
              <UsersTable
                users={users}
                availableRoles={availableRoles}
                userRolesByUserId={userRolesByUserId}
                sort={sort}
                onSortChange={handleSortChange}
                onEdit={handleEdit}
                onRoleToggle={handleRoleToggle}
                onRemoveUser={handleRequestRemoveUser}
                canUpdate={canUpdateUser}
                canDelete={canDeleteUser}
                isSuperAdmin={isAdmin}
                systemRoleIds={systemRoleIds}
                currentUserId={currentUser?.id}
              />
            </div>

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
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        title="Remove user?"
        description={
          userToRemove
            ? `This will permanently remove "${userToRemove.name}".`
            : undefined
        }
        confirmLabel="Remove user"
        errorFallback="Failed to remove user"
        onConfirm={async () => {
          if (!userToRemove) return;
          await deleteUser(userToRemove.id);
          setUserToRemove(null);
        }}
      />
    </DashboardPage.Root>
  );
}
