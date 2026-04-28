"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchControl } from "@/components/common/search-control";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import { ROLE_CREATE_PATH } from "@/lib/role-paths";
import { toast } from "sonner";
import { PAGE_SIZE, useRolesPage } from "./_hooks/use-roles-page";

export default function RolesPage(): ReactElement {
  const {
    canUpdateRole,
    canDeleteRole,
    search,
    page,
    sort,
    roles,
    rolesData,
    rolesLoading,
    rolesError,
    roleToDelete,
    isDeleteDialogOpen,
    setPage,
    setRoleToDelete,
    setIsDeleteDialogOpen,
    handleSearchChange,
    handleSortChange,
    handleEdit,
    handleDeleteRole,
    deleteRole,
  } = useRolesPage();

  if (rolesLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Roles" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading roles...</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Roles" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 flex items-center justify-center">
              <p className="text-destructive">
                Failed to load roles. Check the API and try again.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Roles">
        <Can permission="roles:create">
          <Button asChild>
            <Link href={ROLE_CREATE_PATH}>
              <IconPlus className="size-4" />
              Create Role
            </Link>
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
                ariaLabel="Search roles"
                placeholder="Search..."
                className="w-full max-w-none sm:w-72"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 pt-6">
            {roles.length === 0 ? (
              <EmptyState
                title="No roles yet"
                description="Create roles to group permissions and assign them to users."
                action={
                  <Can permission="roles:create">
                    <Button asChild>
                      <Link href={ROLE_CREATE_PATH}>
                        <IconPlus className="size-4" />
                        Create Role
                      </Link>
                    </Button>
                  </Can>
                }
              />
            ) : (
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
            )}
          </div>
        </div>

        <footer className="empty:hidden border-t border-border bg-background/80">
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={rolesData?.total ?? 0}
            onPageChange={setPage}
            variant="numbered"
          />
        </footer>
      </section>

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
              ? `Successfully deleted ${roleToDelete.name} role and removed ${removedUsers} assignment(s)`
              : `Successfully deleted ${roleToDelete.name} role`,
          );
          setRoleToDelete(null);
        }}
      />
    </div>
  );
}
