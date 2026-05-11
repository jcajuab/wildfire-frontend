"use client";

import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  rbacApi,
  type RbacRoleSummary,
  type RbacUserListQuery,
  type RbacUsersListResponse,
} from "@/lib/api/rbac-api";
import {
  invitationsApi,
  type InvitationListQuery,
} from "@/lib/api/invitations-api";
import type { InvitationListResponse } from "@/types/invitation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { PAGE_SIZE, useUsersPage } from "./_hooks/use-users-page";

export function UsersListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: RbacUserListQuery;
  readonly data: RbacUsersListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => rbacApi.endpoints.getUsers.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(rbacApi.util.upsertQueryData("getUsers", queryArgs, data));
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function RoleOptionsCacheSeeder({
  data,
}: {
  readonly data: readonly RbacRoleSummary[];
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => rbacApi.endpoints.getRoleOptions.select(undefined)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      rbacApi.util.upsertQueryData("getRoleOptions", undefined, [...data]),
    );
  }, [dispatch, data, cachedData]);
  return null;
}

export function InvitationsListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: InvitationListQuery;
  readonly data: InvitationListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) =>
      invitationsApi.endpoints.listInvitations.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(
      invitationsApi.util.upsertQueryData("listInvitations", queryArgs, data),
    );
  }, [dispatch, queryArgs, data, cachedData]);
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
              <IconCheck className="size-4 text-green-600" aria-hidden="true" />
            ) : (
              <IconCopy className="size-4" aria-hidden="true" />
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

export function UsersPageView({
  initialUsers,
  initialRoles,
  initialInvitations,
}: {
  readonly initialUsers?: {
    readonly queryArgs: RbacUserListQuery;
    readonly data: RbacUsersListResponse;
  };
  readonly initialRoles?: readonly RbacRoleSummary[];
  readonly initialInvitations?: InvitationListResponse;
} = {}): ReactElement {
  const {
    currentUser,
    isAdmin,
    canUpdateUser,
    canDeleteUser,
    canCreateUser,
    search,
    invitationSearch,
    roleId,
    userType,
    page,
    activeTab,
    sort,
    invitationPage,
    invitationStatusFilter,
    invitationSort,
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
    invitationsData,
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
    setInvitationPage,
    setActiveTab,
    setIsInviteDialogOpen,
    setIsEditDialogOpen,
    setIsBanDialogOpen,
    setUserToBan,
    setIsResetPasswordDialogOpen,
    handleSearchChange,
    handleInvitationSearchChange,
    handleSortChange,
    handleRoleFilterChange,
    handleUserTypeFilterChange,
    handleInvitationStatusFilterChange,
    handleInvitationSortChange,
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
  } = useUsersPage({ initialUsers, initialRoles, initialInvitations });

  const selectedTab = canCreateUser ? activeTab : "users";
  const invitationsTotal = invitationsData?.total ?? 0;
  const selectedUserRoleIds =
    selectedUser == null
      ? []
      : (userRolesByUserId[selectedUser.id] ?? []).map((role) => role.id);
  const selectedUserIsSystem = selectedUserRoleIds.some((id) =>
    systemRoleIds.includes(id),
  );
  const canManageSelectedUserStatus =
    canDeleteUser &&
    selectedUser != null &&
    !selectedUserIsSystem &&
    selectedUser.id !== currentUser?.id;

  useEffect(() => {
    if (!canCreateUser && activeTab !== "users") {
      void setActiveTab("users");
    }
  }, [activeTab, canCreateUser, setActiveTab]);

  if (usersLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Users" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
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
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
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
            <IconPlus
              className="size-4"
              aria-hidden="true"
              data-icon="inline-start"
            />
            Invite User
          </Button>
        </Can>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs
            value={selectedTab}
            onValueChange={(value) => {
              if (value === "users" || value === "invitations") {
                void setActiveTab(value);
              }
            }}
            className="min-h-0 flex-1 overflow-hidden p-4"
          >
            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
              <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                {canCreateUser ? (
                  <TabsList aria-label="Users page sections">
                    <TabsTrigger value="users" className="px-3">
                      Users
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="px-3">
                      Invitations
                    </TabsTrigger>
                  </TabsList>
                ) : (
                  <h2 className="text-sm font-semibold">Users</h2>
                )}
                <SearchControl
                  value={selectedTab === "users" ? search : invitationSearch}
                  onChange={
                    selectedTab === "users"
                      ? handleSearchChange
                      : handleInvitationSearchChange
                  }
                  ariaLabel={
                    selectedTab === "users"
                      ? "Search users"
                      : "Search invitations"
                  }
                  placeholder={
                    selectedTab === "users"
                      ? "Search by name, username, or email"
                      : "Search by invitee"
                  }
                  className="w-full max-w-none sm:w-80"
                />
              </div>

              <TabsContent
                value="users"
                className="flex min-h-0 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
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
                  {users.length === 0 && !usersFetching ? (
                    <EmptyState
                      title={search ? "No users found" : "No users yet"}
                      description={
                        search
                          ? "Try a different name, username, or email."
                          : "Invite users to give them access to WILDFIRE."
                      }
                      action={
                        !search ? (
                          <Can permission="users:create">
                            <Button onClick={() => setIsInviteDialogOpen(true)}>
                              <IconPlus
                                className="size-4"
                                aria-hidden="true"
                                data-icon="inline-start"
                              />
                              Invite User
                            </Button>
                          </Can>
                        ) : null
                      }
                    />
                  ) : (
                    <UsersTable
                      users={users}
                      availableRoles={availableRoles}
                      userRolesByUserId={userRolesByUserId}
                      sort={sort}
                      onSortChange={handleSortChange}
                      roleFilter={roleId}
                      onRoleFilterChange={handleRoleFilterChange}
                      userTypeFilter={userType}
                      onUserTypeFilterChange={handleUserTypeFilterChange}
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
                  )}
                </div>
              </TabsContent>

              {canCreateUser ? (
                <TabsContent
                  value="invitations"
                  className="flex min-h-0 flex-col overflow-hidden data-[state=inactive]:hidden"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <PendingInvitationsTable
                      invitations={invitations}
                      isLoading={isInvitationsLoading}
                      statusFilter={invitationStatusFilter}
                      sort={invitationSort}
                      onStatusFilterChange={handleInvitationStatusFilterChange}
                      onSortChange={handleInvitationSortChange}
                      resendingInvitationId={resendingInvitationId}
                      onResend={handleResendInvitation}
                      onSendInvitation={() => setIsInviteDialogOpen(true)}
                    />
                  </div>
                </TabsContent>
              ) : null}

              {selectedTab === "users" || selectedTab === "invitations" ? (
                <footer className="border-t border-border bg-background/80">
                  <PaginationFooter
                    page={selectedTab === "users" ? page : invitationPage}
                    pageSize={PAGE_SIZE}
                    total={
                      selectedTab === "users"
                        ? (usersData?.total ?? 0)
                        : invitationsTotal
                    }
                    onPageChange={
                      selectedTab === "users" ? setPage : setInvitationPage
                    }
                    alwaysShow
                  />
                </footer>
              ) : null}
            </section>
          </Tabs>
        </div>
      </section>

      <InviteUsersDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInvite={async (emails) => {
          const didInvite = await handleInvite(emails);
          if (didInvite) {
            await setActiveTab("invitations");
            handleInvitationSearchChange("");
            handleInvitationStatusFilterChange("all");
            handleInvitationSortChange({
              field: "createdAt",
              direction: "desc",
            });
            setInvitationPage(1);
          }
          return didInvite;
        }}
      />

      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
        canManageStatus={canManageSelectedUserStatus}
        onRequestBanUser={(user) => {
          setIsEditDialogOpen(false);
          handleRequestBanUser(user);
        }}
        onRequestUnbanUser={(user) => {
          setIsEditDialogOpen(false);
          handleRequestUnbanUser(user);
        }}
      />

      <ConfirmActionDialog
        open={isBanDialogOpen}
        onOpenChange={setIsBanDialogOpen}
        title={userToBan?.bannedAt ? "Unban user?" : "Ban user?"}
        description={
          userToBan
            ? userToBan.bannedAt
              ? `This will restore ${userToBan.name}'s access to WILDFIRE.`
              : `This will ban ${userToBan.name}, revoke their sessions, and delete content, playlists, and schedules they own. This cannot be undone.`
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
