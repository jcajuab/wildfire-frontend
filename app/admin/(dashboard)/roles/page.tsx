"use client";

import type { ReactElement } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { RoleDialog } from "@/components/roles/role-dialog";
import { SearchControl } from "@/components/common/search-control";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PAGE_SIZE, useRolesPage } from "./use-roles-page";

export default function RolesPage(): ReactElement {
  const {
    canUpdateRole,
    canDeleteRole,
    canReadUsers,
    search,
    page,
    sort,
    roles,
    rolesData,
    permissions,
    initialUsers,
    rolePermissionsData,
    editDataReady,
    rolesLoading,
    rolesError,
    dialogOpen,
    dialogMode,
    selectedRole,
    roleToDelete,
    isDeleteDialogOpen,
    setPage,
    setDialogOpen,
    setSelectedRole,
    setRoleToDelete,
    setIsDeleteDialogOpen,
    handleSearchChange,
    handleSortChange,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDeleteRole,
    deleteRole,
  } = useRolesPage();

  if (rolesLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Roles" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-muted-foreground">Loading roles…</p>
            </div>
          </DashboardPage.Content>
        </DashboardPage.Body>
      </DashboardPage.Root>
    );
  }

  if (rolesError) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Roles" />
        <DashboardPage.Body>
          <DashboardPage.Content>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                Failed to load roles. Check the API and try again.
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
        title="Roles"
        actions={
          <Can permission="roles:create">
            <Button onClick={handleCreate}>
              <IconPlus className="size-4" />
              Create Role
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
              ariaLabel="Search roles"
              placeholder="Search roles…"
              className="w-full max-w-none md:w-72"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            <div className="overflow-hidden rounded-md border border-border">
              <RolesTable
                roles={roles}
                sort={sort}
                onSortChange={handleSortChange}
                onEdit={handleEdit}
                onDelete={handleDeleteRole}
                canEdit={canUpdateRole}
                canDelete={canDeleteRole}
              />
            </div>
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={rolesData?.total ?? 0}
            onPageChange={setPage}
            variant="numbered"
          />
        </DashboardPage.Footer>
      </DashboardPage.Body>

      <RoleDialog
        mode={dialogMode}
        role={selectedRole}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedRole(null);
        }}
        editDataReady={editDataReady}
        permissions={permissions}
        initialUsers={initialUsers}
        canReadUsers={canReadUsers}
        initialPermissionIds={rolePermissionsData?.map(
          (permission) => permission.id,
        )}
        onSubmit={handleSubmit}
      />

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setRoleToDelete(null);
          }
        }}
        title="Delete role?"
        description={
          roleToDelete
            ? (roleToDelete.usersCount ?? 0) > 0
              ? `This will permanently delete "${roleToDelete.name}" and unassign ${
                  roleToDelete.usersCount ?? 0
                } user(s). Users that have this role will have their permissions revoked.`
              : `This will permanently delete "${roleToDelete.name}".`
            : undefined
        }
        confirmLabel="Delete role"
        errorFallback="Failed to delete role."
        onConfirm={async () => {
          if (!roleToDelete) return;
          await deleteRole(roleToDelete.id);
          const removedUsers = roleToDelete.usersCount ?? 0;
          toast.success(
            removedUsers > 0
              ? `Deleted "${roleToDelete.name}" and removed ${removedUsers} assignment(s).`
              : `Deleted "${roleToDelete.name}".`,
          );
          setRoleToDelete(null);
        }}
      />
    </DashboardPage.Root>
  );
}
