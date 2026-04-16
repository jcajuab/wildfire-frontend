"use client";

import type { ReactElement } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconUserPlus, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";
import {
  DESIGN_PERMISSIONS,
  mergeDesignPermissionsWithApi,
  type DesignPermissionWithId,
} from "@/lib/design-permissions";
import {
  formatPermissionId,
  formatPermissionReadableLabel,
  formatPermissionTooltipDescription,
} from "@/lib/format-permission";
import type { Permission, Role, RoleFormData, RoleUser } from "@/types/role";

const INITIAL_ASSIGNED_VISIBLE_COUNT = 25;
const ASSIGNED_VISIBLE_COUNT_STEP = 25;
const PERMISSION_RESOURCE_ORDER = Array.from(
  new Set(DESIGN_PERMISSIONS.map((permission) => permission.resource)),
);

function formatPermissionResourceLabel(resource: string): string {
  if (resource === "audit") {
    return "Audit";
  }
  return `${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;
}

export interface RoleFormState {
  readonly canSubmit: boolean;
  readonly isSubmitting: boolean;
  readonly submit: () => Promise<void>;
}

interface RoleFormProps {
  readonly mode: "create" | "edit";
  readonly initialRole?: Role | null;
  readonly permissions: readonly Permission[];
  readonly initialUsers: readonly RoleUser[];
  readonly canReadUsers: boolean;
  readonly initialPermissionIds: readonly string[];
  readonly onSubmit: (data: RoleFormData) => Promise<void> | void;
  readonly onStateChange?: (state: RoleFormState) => void;
}

export function RoleForm({
  mode,
  initialRole,
  permissions,
  initialUsers,
  canReadUsers,
  initialPermissionIds,
  onSubmit,
  onStateChange,
}: RoleFormProps): ReactElement {
  const [name, setName] = useState(initialRole?.name ?? "");
  const [description, setDescription] = useState(
    initialRole?.description ?? "",
  );
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    mode === "edit" && Array.isArray(initialPermissionIds)
      ? [...initialPermissionIds]
      : [],
  );
  const [assignedUsers, setAssignedUsers] = useState<RoleUser[]>(() =>
    mode === "edit" ? [...initialUsers] : [],
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const deferredUserSearch = useDeferredValue(userSearch.trim());
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(
    INITIAL_ASSIGNED_VISIBLE_COUNT,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const latestNameRef = useRef(name);
  const latestDescriptionRef = useRef(description);
  const latestPermissionIdsRef = useRef(selectedPermissions);
  const latestAssignedUsersRef = useRef(assignedUsers);
  const latestOnSubmitRef = useRef(onSubmit);
  const emittedStateRef = useRef<RoleFormState | null>(null);
  const { data: searchedUsers = [] } = useGetUserOptionsQuery(
    {
      q: deferredUserSearch.length > 0 ? deferredUserSearch : undefined,
    },
    {
      skip: !canReadUsers,
    },
  );

  const handlePermissionToggle = useCallback(
    (permissionId: string | null, checked: boolean): void => {
      if (permissionId == null) return;
      if (checked) {
        setSelectedPermissions((prev) => [...prev, permissionId]);
        return;
      }

      setSelectedPermissions((prev) =>
        prev.filter((id) => id !== permissionId),
      );
    },
    [],
  );

  const displayPermissions: DesignPermissionWithId[] = useMemo(
    () => mergeDesignPermissionsWithApi(permissions),
    [permissions],
  );

  const permissionsByResource = useMemo(() => {
    const grouped = new Map<string, DesignPermissionWithId[]>();
    for (const resource of PERMISSION_RESOURCE_ORDER) {
      grouped.set(resource, []);
    }

    for (const permission of displayPermissions) {
      const existing = grouped.get(permission.resource);
      if (existing) {
        existing.push(permission);
        continue;
      }

      grouped.set(permission.resource, [permission]);
    }

    return grouped;
  }, [displayPermissions]);

  const availableUsers = useMemo<readonly RoleUser[]>(
    () =>
      searchedUsers.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      })),
    [searchedUsers],
  );

  const availableUsersById = useMemo(
    () => new Map(availableUsers.map((user) => [user.id, user])),
    [availableUsers],
  );

  const assignedUserIdSet = useMemo(
    () => new Set(assignedUsers.map((user) => user.id)),
    [assignedUsers],
  );

  const unassignedUsers = useMemo(
    () => availableUsers.filter((user) => !assignedUserIdSet.has(user.id)),
    [availableUsers, assignedUserIdSet],
  );

  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUnassignedUsers = useMemo(() => {
    if (normalizedUserSearch.length === 0) {
      return unassignedUsers;
    }

    return unassignedUsers.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedUserSearch) ||
        user.username.toLowerCase().includes(normalizedUserSearch) ||
        (user.email?.toLowerCase().includes(normalizedUserSearch) ?? false)
      );
    });
  }, [normalizedUserSearch, unassignedUsers]);

  const visibleAssignedUsers = useMemo(
    () => assignedUsers.slice(0, visibleAssignedCount),
    [assignedUsers, visibleAssignedCount],
  );

  const hasMoreAssignedUsers = visibleAssignedCount < assignedUsers.length;

  useEffect(() => {
    latestNameRef.current = name;
  }, [name]);

  useEffect(() => {
    latestDescriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    latestPermissionIdsRef.current = selectedPermissions;
  }, [selectedPermissions]);

  useEffect(() => {
    latestAssignedUsersRef.current = assignedUsers;
  }, [assignedUsers]);

  useEffect(() => {
    latestOnSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleAddUser = useCallback((): void => {
    if (!selectedUserId) return;
    const user = availableUsersById.get(selectedUserId);
    if (!user) return;
    if (assignedUserIdSet.has(user.id)) return;
    setAssignedUsers((prev) => [...prev, user]);
    setSelectedUserId("");
    setUserSearch("");
    setVisibleAssignedCount((prev) => prev + 1);
  }, [assignedUserIdSet, availableUsersById, selectedUserId]);

  const handleRemoveUser = useCallback((userId: string): void => {
    setAssignedUsers((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  const submit = useCallback(async (): Promise<void> => {
    const trimmedName = latestNameRef.current.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await latestOnSubmitRef.current({
        name: trimmedName,
        description: latestDescriptionRef.current.trim() || null,
        permissionIds: latestPermissionIdsRef.current,
        userIds: latestAssignedUsersRef.current.map((user) => user.id),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  const handleSubmit = useCallback(
    (event: { preventDefault: () => void }): void => {
      event.preventDefault();
      void submit();
    },
    [submit],
  );

  const isValid = name.trim().length > 0;

  useEffect(() => {
    if (!onStateChange) return;

    const nextState: RoleFormState = {
      canSubmit: isValid,
      isSubmitting,
      submit,
    };

    const previousState = emittedStateRef.current;
    if (
      previousState?.canSubmit === nextState.canSubmit &&
      previousState.isSubmitting === nextState.isSubmitting &&
      previousState.submit === nextState.submit
    ) {
      return;
    }

    emittedStateRef.current = nextState;
    onStateChange(nextState);
  }, [isSubmitting, isValid, onStateChange, submit]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-6">
        <section
          className="scroll-mt-24"
          aria-labelledby="role-form-display-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h3
                  id="role-form-display-heading"
                  className="text-sm font-semibold"
                >
                  Display
                </h3>
              </CardTitle>
              <CardDescription>
                Name this role and define a short description.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter role name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          className="scroll-mt-24"
          aria-labelledby="role-form-permissions-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h3
                  id="role-form-permissions-heading"
                  className="text-sm font-semibold"
                >
                  Permissions
                </h3>
              </CardTitle>
              <CardDescription>
                Choose what actions this role can perform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
                {PERMISSION_RESOURCE_ORDER.map((resource) => {
                  const resourcePermissions =
                    permissionsByResource.get(resource) ?? [];
                  if (resourcePermissions.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={resource}
                      className="rounded-md border border-border bg-muted/20"
                    >
                      <h4 className="border-b border-border px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {formatPermissionResourceLabel(resource)}
                      </h4>
                      <div className="px-3 py-1">
                        {resourcePermissions.map((permission, index) => (
                          <div
                            key={`${permission.resource}:${permission.action}`}
                          >
                            <div className="flex items-center justify-between gap-3 py-2">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-sm font-medium">
                                  {formatPermissionReadableLabel(permission)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPermissionTooltipDescription(
                                    permission,
                                  )}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {formatPermissionId(permission)}
                                </span>
                              </div>
                              <Switch
                                checked={
                                  permission.id !== null &&
                                  selectedPermissions.includes(permission.id)
                                }
                                disabled={permission.id === null}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(permission.id, checked)
                                }
                              />
                            </div>
                            {index < resourcePermissions.length - 1 ? (
                              <Separator />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          className="scroll-mt-24"
          aria-labelledby="role-form-users-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h3
                  id="role-form-users-heading"
                  className="text-sm font-semibold"
                >
                  Manage Users ({assignedUsers.length})
                </h3>
              </CardTitle>
              <CardDescription>
                Assign users who should inherit this role.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {canReadUsers ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto] lg:items-end">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="roleUserSearch">Search Users</Label>
                    <Input
                      id="roleUserSearch"
                      placeholder="Search users by name, username, or email"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="roleUserSelect">Select User</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger
                        id="roleUserSelect"
                        className="min-w-0 w-full"
                      >
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        align="start"
                        className="w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)"
                      >
                        {filteredUnassignedUsers.length > 0 ? (
                          filteredUnassignedUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no-matching-users" disabled>
                            No matching users.
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddUser}
                    disabled={!selectedUserId}
                    className="w-full lg:w-auto"
                  >
                    <IconUserPlus className="size-4" />
                    Add User
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  User assignment is unavailable without `users:read`.
                </div>
              )}

              {assignedUsers.length > 0 ? (
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
                  {visibleAssignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          @{user.username}
                          {user.email ? ` • ${user.email}` : ""}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={!canReadUsers}
                        aria-label={`Remove ${user.name} from role`}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {hasMoreAssignedUsers ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setVisibleAssignedCount(
                          (prev) => prev + ASSIGNED_VISIBLE_COUNT_STEP,
                        )
                      }
                      className="mt-1"
                    >
                      Load More Users
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </form>
  );
}
