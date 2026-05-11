"use client";

import type { ReactElement } from "react";
import { useLayoutEffect } from "react";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { SearchControl } from "@/components/common/search-control";
import { PaginationFooter } from "@/components/common/pagination-footer";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import {
  rbacApi,
  type RbacRoleListQuery,
  type RbacRolesListResponse,
} from "@/lib/api/rbac-api";
import { ROLE_CREATE_PATH } from "@/lib/role-paths";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { toast } from "sonner";
import { PAGE_SIZE, useRolesPage } from "./_hooks/use-roles-page";

export function RolesListCacheSeeder({
  queryArgs,
  data,
}: {
  readonly queryArgs: RbacRoleListQuery;
  readonly data: RbacRolesListResponse;
}): null {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(
    (state) => rbacApi.endpoints.getRoles.select(queryArgs)(state).data,
  );

  useLayoutEffect(() => {
    if (cachedData) {
      return;
    }

    dispatch(rbacApi.util.upsertQueryData("getRoles", queryArgs, data));
  }, [dispatch, queryArgs, data, cachedData]);
  return null;
}

export function RolesPageView({
  initialList,
}: {
  readonly initialList?: {
    readonly queryArgs: RbacRoleListQuery;
    readonly data: RbacRolesListResponse;
  };
} = {}): ReactElement {
  const {
    canUpdateRole,
    canDeleteRole,
    search,
    page,
    sort,
    roles,
    rolesData,
    rolesLoading,
    rolesFetching,
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
  } = useRolesPage({ initialList });

  if (rolesLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
        <PageHeader title="Roles" />
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
              <div className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Loading roles...
                </span>
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
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
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
              <IconPlus
                className="size-4"
                aria-hidden="true"
                data-icon="inline-start"
              />
              Create Role
            </Link>
          </Button>
        </Can>
      </PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden p-4">
            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
              <div className="flex shrink-0 justify-end border-b border-border px-4 py-3">
                <SearchControl
                  value={search}
                  onChange={handleSearchChange}
                  ariaLabel="Search roles"
                  placeholder="Search by role name or description"
                  className="w-full max-w-none sm:w-80"
                />
              </div>

              {rolesFetching && !rolesLoading ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                  <div className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">
                      Searching for roles...
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto">
                <RolesTable
                  roles={roles}
                  sort={sort}
                  onSortChange={handleSortChange}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRole}
                  canEdit={canUpdateRole}
                  canDelete={canDeleteRole}
                  emptyState={{
                    title: search ? "No roles found" : "No roles yet",
                    description: search
                      ? "Try a different role name or description."
                      : "Create roles to group permissions and assign them to users.",
                    action: search ? null : (
                      <Can permission="roles:create">
                        <Button asChild>
                          <Link href={ROLE_CREATE_PATH}>
                            <IconPlus
                              className="size-4"
                              aria-hidden="true"
                              data-icon="inline-start"
                            />
                            Create Role
                          </Link>
                        </Button>
                      </Can>
                    ),
                  }}
                />
              </div>

              <footer className="border-t border-border bg-background/80">
                <PaginationFooter
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={rolesData?.total ?? 0}
                  onPageChange={setPage}
                  alwaysShow
                />
              </footer>
            </section>
          </div>
        </div>
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
              ? `This will permanently delete "${roleToDelete.name}" and unassign ${roleToDelete.usersCount ?? 0} user(s). Users that have this role will have their permissions revoked.`
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
