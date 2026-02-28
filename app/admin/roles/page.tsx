"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Can } from "@/components/common/can";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
import { RoleDialog } from "@/components/roles/role-dialog";
import { RoleSearchInput } from "@/components/roles/role-search-input";
import { RolesPagination } from "@/components/roles/roles-pagination";
import { RolesTable } from "@/components/roles/roles-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/context/auth-context";
import { useCan } from "@/hooks/use-can";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import {
  useApproveRoleDeletionRequestMutation,
  useCreateRoleDeletionRequestMutation,
  useGetRolesQuery,
  useGetRoleDeletionRequestsQuery,
  useGetPermissionsQuery,
  useGetUsersQuery,
  useGetRolePermissionsQuery,
  useGetRoleUsersQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useRejectRoleDeletionRequestMutation,
  useSetRolePermissionsMutation,
  useSetUserRolesMutation,
  useLazyGetUserRolesQuery,
} from "@/lib/api/rbac-api";
import type {
  Role,
  RoleFormData,
  RoleSort,
  RoleSortDirection,
  RoleSortField,
} from "@/types/role";

const ROLE_SORT_FIELDS = ["name", "usersCount"] as const;
const ROLE_SORT_DIRECTIONS = ["asc", "desc"] as const;
const HIGH_RISK_TARGET_THRESHOLD = 20;
const ROLE_DELETION_REASON_MAX_LENGTH = 1024;

export default function RolesPage(): ReactElement {
  const { user } = useAuth();
  const canUpdateRole = useCan("roles:update");
  const canDeleteRole = useCan("roles:delete");
  const canReadUsers = useCan("users:read");
  const isRoot = user?.isRoot === true;
  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery();
  const { data: permissionsData } = useGetPermissionsQuery();
  const { data: usersData } = useGetUsersQuery(undefined, {
    skip: !canReadUsers,
  });
  const { data: deletionRequestsData } = useGetRoleDeletionRequestsQuery(
    undefined,
    {
      skip: !canDeleteRole,
    },
  );

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [createRoleDeletionRequest] = useCreateRoleDeletionRequestMutation();
  const [approveRoleDeletionRequest] = useApproveRoleDeletionRequestMutation();
  const [rejectRoleDeletionRequest] = useRejectRoleDeletionRequestMutation();
  const [setRolePermissions] = useSetRolePermissionsMutation();
  const [setUserRoles] = useSetUserRolesMutation();
  const [getUserRolesTrigger] = useLazyGetUserRolesQuery();

  const [search, setSearch] = useQueryStringState("q", "");
  const [sortField, setSortField] = useQueryEnumState<RoleSortField>(
    "sortField",
    "name",
    ROLE_SORT_FIELDS,
  );
  const [sortDirection, setSortDirection] =
    useQueryEnumState<RoleSortDirection>(
      "sortDir",
      "asc",
      ROLE_SORT_DIRECTIONS,
    );
  const [page, setPage] = useQueryNumberState("page", 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [deleteRequestReason, setDeleteRequestReason] = useState("");
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] =
    useState(false);

  const {
    data: rolePermissionsData,
    isLoading: rolePermissionsLoading,
    isFetching: rolePermissionsFetching,
    isSuccess: rolePermissionsSuccess,
  } = useGetRolePermissionsQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
    refetchOnMountOrArgChange: true,
  });
  const {
    data: roleUsersData,
    isLoading: roleUsersLoading,
    isFetching: roleUsersFetching,
    isSuccess: roleUsersSuccess,
  } = useGetRoleUsersQuery(selectedRole?.id ?? "", {
    skip: !dialogOpen || !selectedRole,
    refetchOnMountOrArgChange: true,
  });

  const editDataReady =
    dialogMode === "create" ||
    (dialogMode === "edit" &&
      !rolePermissionsLoading &&
      !roleUsersLoading &&
      !rolePermissionsFetching &&
      !roleUsersFetching &&
      rolePermissionsSuccess &&
      roleUsersSuccess &&
      rolePermissionsData !== undefined &&
      roleUsersData !== undefined);

  const pageSize = 10;

  const sort = useMemo<RoleSort>(
    () => ({
      field: sortField,
      direction: sortDirection,
    }),
    [sortField, sortDirection],
  );

  const roles: Role[] = useMemo(
    () =>
      (rolesData ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role.usersCount,
      })),
    [rolesData],
  );
  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);
  const availableUsers = useMemo(
    () =>
      (usersData ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    [usersData],
  );

  const pendingDeletionRoleIds = useMemo(() => {
    const pendingIds = new Set<string>();
    for (const request of deletionRequestsData ?? []) {
      if (request.status === "pending") {
        pendingIds.add(request.roleId);
      }
    }
    return pendingIds;
  }, [deletionRequestsData]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleSortChange = useCallback(
    (nextSort: RoleSort) => {
      setSortField(nextSort.field);
      setSortDirection(nextSort.direction);
      setPage(1);
    },
    [setSortField, setSortDirection, setPage],
  );

  const handleCreate = useCallback(() => {
    setDialogMode("create");
    setSelectedRole(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setDialogMode("edit");
    setSelectedRole(role);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
      try {
        const isHighRiskOperation =
          data.permissionIds.length > HIGH_RISK_TARGET_THRESHOLD ||
          data.userIds.length > HIGH_RISK_TARGET_THRESHOLD;
        if (isHighRiskOperation && data.highRiskConfirmed !== true) {
          throw new Error("High-impact changes must be explicitly confirmed.");
        }
        const policyVersion = data.policyVersion;

        if (dialogMode === "create") {
          const role = await createRole({
            name: data.name,
            description: data.description ?? null,
          }).unwrap();
          await setRolePermissions({
            roleId: role.id,
            permissionIds: [...data.permissionIds],
            policyVersion,
          }).unwrap();
          await Promise.all(
            data.userIds.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: [
                  ...currentRoles.map((roleItem) => roleItem.id),
                  role.id,
                ],
                policyVersion,
              }).unwrap();
            }),
          );
          setDialogOpen(false);
        } else if (selectedRole) {
          await updateRole({
            id: selectedRole.id,
            name: data.name,
            description: data.description ?? null,
          }).unwrap();
          await setRolePermissions({
            roleId: selectedRole.id,
            permissionIds: [...data.permissionIds],
            policyVersion,
          }).unwrap();
          const currentUserIds = (roleUsersData ?? []).map((user) => user.id);
          const desiredUserIds = [...data.userIds];
          const toAdd = desiredUserIds.filter(
            (id) => !currentUserIds.includes(id),
          );
          const toRemove = currentUserIds.filter(
            (id) => !desiredUserIds.includes(id),
          );
          await Promise.all(
            toAdd.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: [
                  ...currentRoles.map((roleItem) => roleItem.id),
                  selectedRole.id,
                ],
                policyVersion,
              }).unwrap();
            }),
          );
          await Promise.all(
            toRemove.map(async (userId) => {
              const currentRoles = await getUserRolesTrigger(
                userId,
                true,
              ).unwrap();
              await setUserRoles({
                userId,
                roleIds: currentRoles
                  .map((roleItem) => roleItem.id)
                  .filter((id) => id !== selectedRole.id),
                policyVersion,
              }).unwrap();
            }),
          );
          setDialogOpen(false);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    },
    [
      dialogMode,
      selectedRole,
      roleUsersData,
      createRole,
      updateRole,
      setRolePermissions,
      setUserRoles,
      getUserRolesTrigger,
    ],
  );

  const handleDeleteRequest = useCallback(
    (role: Role) => {
      if (!isRoot && pendingDeletionRoleIds.has(role.id)) {
        toast.error(
          `A pending deletion request already exists for "${role.name}".`,
        );
        return;
      }
      setRoleToDelete(role);
      if (isRoot) {
        setIsDeleteDialogOpen(true);
        return;
      }
      setDeleteRequestReason("");
      setIsRequestDialogOpen(true);
    },
    [isRoot, pendingDeletionRoleIds],
  );

  const trimmedDeleteRequestReason = deleteRequestReason.trim();
  const isDeleteRequestReasonValid =
    trimmedDeleteRequestReason.length > 0 &&
    trimmedDeleteRequestReason.length <= ROLE_DELETION_REASON_MAX_LENGTH;

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const searchLower = search.toLowerCase();
    return roles.filter((role) =>
      role.name.toLowerCase().includes(searchLower),
    );
  }, [roles, search]);

  const sortedRoles = useMemo(() => {
    return [...filteredRoles].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "usersCount":
          return ((a.usersCount ?? 0) - (b.usersCount ?? 0)) * direction;
        default:
          return 0;
      }
    });
  }, [filteredRoles, sort]);

  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRoles.slice(start, start + pageSize);
  }, [sortedRoles, page]);

  if (rolesLoading) {
    return (
      <DashboardPage.Root>
        <DashboardPage.Header title="Roles" />
        <DashboardPage.Body>
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading roles…</p>
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
          <DashboardPage.Content className="flex items-center justify-center">
            <p className="text-destructive">
              Failed to load roles. Check the API and try again.
            </p>
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
        <DashboardPage.Toolbar>
          <h2 className="text-base font-semibold">Search Results</h2>
          <RoleSearchInput
            value={search}
            onChange={handleSearchChange}
            className="w-full max-w-none md:w-72"
          />
        </DashboardPage.Toolbar>

        <DashboardPage.Content className="pt-6">
          <div className="overflow-hidden rounded-lg border">
            <RolesTable
              roles={paginatedRoles}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              canEdit={canUpdateRole}
              canDelete={canDeleteRole}
              deleteLabel={isRoot ? "Delete Role" : "Request Deletion"}
              getDeleteLabel={(role) =>
                !isRoot && pendingDeletionRoleIds.has(role.id)
                  ? "Request Pending"
                  : isRoot
                    ? "Delete Role"
                    : "Request Deletion"
              }
              isDeleteDisabled={(role) =>
                !isRoot && pendingDeletionRoleIds.has(role.id)
              }
            />
          </div>
        </DashboardPage.Content>

        <DashboardPage.Footer>
          <RolesPagination
            page={page}
            pageSize={pageSize}
            total={sortedRoles.length}
            onPageChange={setPage}
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
        availableUsers={availableUsers}
        initialPermissionIds={rolePermissionsData?.map(
          (permission) => permission.id,
        )}
        initialUserIds={roleUsersData?.map((user) => user.id)}
        onSubmit={handleSubmit}
      />

      {isRoot ? (
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
          onConfirm={async () => {
            if (!roleToDelete) return;
            try {
              await deleteRole(roleToDelete.id).unwrap();
              const removedUsers = roleToDelete.usersCount ?? 0;
              toast.success(
                removedUsers > 0
                  ? `Deleted "${roleToDelete.name}" and removed ${removedUsers} assignment(s).`
                  : `Deleted "${roleToDelete.name}".`,
              );
              setRoleToDelete(null);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to delete role",
              );
              throw err;
            }
          }}
        />
      ) : null}

      <Dialog
        open={isRequestDialogOpen}
        onOpenChange={(open) => {
          setIsRequestDialogOpen(open);
          if (!open) {
            setDeleteRequestReason("");
            setRoleToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Request role deletion?</DialogTitle>
            <DialogDescription>
              {roleToDelete
                ? `Submit your request to delete "${roleToDelete.name}". A Root user must review and approve this request.`
                : "Submit your request for Root approval."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="role-delete-request-reason">Reason</Label>
            <Textarea
              id="role-delete-request-reason"
              rows={4}
              value={deleteRequestReason}
              onChange={(event) => setDeleteRequestReason(event.target.value)}
              maxLength={ROLE_DELETION_REASON_MAX_LENGTH}
              placeholder="Explain why this role should be deleted"
            />
            <p className="text-xs text-muted-foreground">
              {trimmedDeleteRequestReason.length}/
              {ROLE_DELETION_REASON_MAX_LENGTH}
            </p>
            {!isDeleteRequestReasonValid ? (
              <p className="text-destructive text-xs">
                A reason is required to request role deletion.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRequestDialogOpen(false);
                setDeleteRequestReason("");
                setRoleToDelete(null);
              }}
              disabled={isSubmittingDeleteRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!roleToDelete || !isDeleteRequestReasonValid) return;
                setIsSubmittingDeleteRequest(true);
                try {
                  await createRoleDeletionRequest({
                    roleId: roleToDelete.id,
                    reason: trimmedDeleteRequestReason,
                  }).unwrap();
                  toast.success(
                    `Deletion request for "${roleToDelete.name}" was sent to Root.`,
                  );
                  setIsRequestDialogOpen(false);
                  setDeleteRequestReason("");
                  setRoleToDelete(null);
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to request role deletion",
                  );
                } finally {
                  setIsSubmittingDeleteRequest(false);
                }
              }}
              disabled={
                !isDeleteRequestReasonValid || isSubmittingDeleteRequest
              }
            >
              {isSubmittingDeleteRequest ? "Requesting..." : "Request deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Can permission="roles:delete">
        <div className="mx-auto w-full max-w-[--breakpoint-2xl] px-4 pb-6 md:px-6 lg:px-8">
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Role Deletion Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Requested By</th>
                    <th className="px-4 py-2">Requested At</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Reason</th>
                    {isRoot ? (
                      <th className="px-4 py-2 text-right">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(deletionRequestsData ?? []).map((request) => {
                    const reasonText = request.reason?.trim() ?? "";
                    return (
                      <tr key={request.id} className="border-t">
                        <td className="px-4 py-2">{request.roleName}</td>
                        <td className="px-4 py-2">{request.requestedByName}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatDateTime(request.requestedAt)}
                        </td>
                        <td className="px-4 py-2">{request.status}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {reasonText ? (
                            <span
                              className="block max-w-[20rem] truncate md:max-w-[30rem]"
                              title={reasonText}
                            >
                              {reasonText}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {isRoot ? (
                          <td className="px-4 py-2 text-right">
                            {request.status === "pending" ? (
                              <div className="inline-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      await approveRoleDeletionRequest({
                                        requestId: request.id,
                                      }).unwrap();
                                      toast.success(
                                        "Deletion request approved.",
                                      );
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : "Failed to approve request",
                                      );
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await rejectRoleDeletionRequest({
                                        requestId: request.id,
                                      }).unwrap();
                                      toast.success(
                                        "Deletion request rejected.",
                                      );
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : "Failed to reject request",
                                      );
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                  {(deletionRequestsData ?? []).length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-muted-foreground"
                        colSpan={isRoot ? 6 : 5}
                      >
                        No role deletion requests yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Can>
    </DashboardPage.Root>
  );
}
