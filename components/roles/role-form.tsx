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
import {
  IconChevronDown,
  IconInfoCircle,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";

import { RequiredLabel } from "@/components/common/required-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxVirtualList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInfiniteUserOptions } from "@/hooks/use-infinite-user-options";
import {
  DESIGN_PERMISSIONS,
  mergeDesignPermissionsWithApi,
  type DesignPermissionWithId,
} from "@/lib/design-permissions";
import {
  formatPermissionReadableLabel,
  formatPermissionTooltipDescription,
} from "@/lib/format-permission";
import { cn } from "@/lib/utils";
import type { Permission, Role, RoleFormData, RoleUser } from "@/types/role";

const INITIAL_ASSIGNED_VISIBLE_COUNT = 25;
const ASSIGNED_VISIBLE_COUNT_STEP = 25;
const DEFAULT_CREATE_PERMISSION_KEYS = new Set([
  "displays:read",
  "content:read",
  "playlists:read",
  "schedules:read",
]);
const WRITE_PERMISSION_ACTIONS = new Set(["create", "update", "delete"]);
const PERMISSION_RESOURCE_ORDER = Array.from(
  new Set(DESIGN_PERMISSIONS.map((permission) => permission.resource)),
);
const PERMISSION_GROUPS = [
  {
    key: "core",
    label: "Core",
    resources: ["displays", "content", "playlists", "schedules"],
  },
  {
    key: "manage",
    label: "Manage",
    resources: ["users", "roles", "audit"],
  },
  {
    key: "ai",
    label: "AI",
    resources: ["ai"],
  },
] as const;
const PERMISSION_ACTION_ORDER = [
  "read",
  "create",
  "update",
  "delete",
  "access",
] as const;

function getPermissionKey(permission: {
  readonly resource: string;
  readonly action: string;
}): string {
  return `${permission.resource}:${permission.action}`;
}

function formatPermissionResourceLabel(resource: string): string {
  if (resource === "audit") {
    return "Logs";
  }
  if (resource === "ai") {
    return "AI";
  }
  return `${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;
}

function formatPermissionActionLabel(action: string): string {
  switch (action) {
    case "read":
      return "View";
    case "update":
      return "Edit";
    case "access":
      return "Access";
    default:
      return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
  }
}

function isWritePermission(permission: { readonly action: string }): boolean {
  return WRITE_PERMISSION_ACTIONS.has(permission.action);
}

function normalizePermissionSelection(
  permissionIds: readonly string[],
  displayPermissions: readonly DesignPermissionWithId[],
): string[] {
  const selectedIds = new Set(permissionIds);
  const permissionById = new Map(
    displayPermissions.flatMap((permission) =>
      permission.id === null ? [] : [[permission.id, permission]],
    ),
  );
  const permissionIdByKey = new Map(
    displayPermissions.flatMap((permission) =>
      permission.id === null
        ? []
        : [[getPermissionKey(permission), permission.id]],
    ),
  );

  for (const permissionId of permissionIds) {
    const permission = permissionById.get(permissionId);
    if (!permission || !isWritePermission(permission)) continue;

    const readPermissionId = permissionIdByKey.get(
      `${permission.resource}:read`,
    );
    if (readPermissionId) {
      selectedIds.add(readPermissionId);
    }
  }

  const orderedIds = displayPermissions.flatMap((permission) =>
    permission.id !== null && selectedIds.has(permission.id)
      ? [permission.id]
      : [],
  );
  const knownIds = new Set(orderedIds);
  const unknownIds = permissionIds.filter((permissionId) => {
    if (knownIds.has(permissionId)) return false;
    return !displayPermissions.some(
      (permission) => permission.id === permissionId,
    );
  });

  return [...orderedIds, ...unknownIds];
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
  const [isUserComboboxOpen, setIsUserComboboxOpen] = useState(false);
  const deferredUserSearch = useDeferredValue(userSearch.trim());
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(
    INITIAL_ASSIGNED_VISIBLE_COUNT,
  );
  const [openPermissionGroups, setOpenPermissionGroups] = useState<
    Record<(typeof PERMISSION_GROUPS)[number]["key"], boolean>
  >({
    core: true,
    manage: false,
    ai: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const didApplyCreateDefaultsRef = useRef(false);
  const didApplyEditOpenGroupsRef = useRef(false);
  const latestNameRef = useRef(name);
  const latestDescriptionRef = useRef(description);
  const latestPermissionIdsRef = useRef(selectedPermissions);
  const latestDisplayPermissionsRef = useRef<DesignPermissionWithId[]>([]);
  const latestAssignedUsersRef = useRef(assignedUsers);
  const latestOnSubmitRef = useRef(onSubmit);
  const emittedStateRef = useRef<RoleFormState | null>(null);
  const ignoredUserSearchValuesRef = useRef<Set<string>>(new Set());
  const {
    users: searchedUsers,
    hasMore: hasMoreUserOptions,
    isLoadingMore: isUserOptionsLoadingMore,
    loadMore: loadMoreUserOptions,
  } = useInfiniteUserOptions({
    enabled: canReadUsers,
    search: deferredUserSearch,
    pageSize: 50,
  });

  const displayPermissions: DesignPermissionWithId[] = useMemo(
    () => mergeDesignPermissionsWithApi(permissions),
    [permissions],
  );

  const permissionById = useMemo(
    () =>
      new Map(
        displayPermissions.flatMap((permission) =>
          permission.id === null ? [] : [[permission.id, permission]],
        ),
      ),
    [displayPermissions],
  );

  const permissionIdByKey = useMemo(
    () =>
      new Map(
        displayPermissions.flatMap((permission) =>
          permission.id === null
            ? []
            : [[getPermissionKey(permission), permission.id]],
        ),
      ),
    [displayPermissions],
  );

  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissions),
    [selectedPermissions],
  );

  const isReadPermissionLocked = useCallback(
    (permission: DesignPermissionWithId): boolean => {
      if (permission.action !== "read") return false;

      return displayPermissions.some((candidate) => {
        if (
          candidate.resource !== permission.resource ||
          candidate.id === null ||
          !isWritePermission(candidate)
        ) {
          return false;
        }

        return selectedPermissionSet.has(candidate.id);
      });
    },
    [displayPermissions, selectedPermissionSet],
  );

  const handlePermissionToggle = useCallback(
    (permissionId: string | null, checked: boolean): void => {
      if (permissionId == null) return;
      const permission = permissionById.get(permissionId);
      if (!permission) return;

      setSelectedPermissions((prev) => {
        if (!checked && isReadPermissionLocked(permission)) {
          return prev;
        }

        const next = new Set(prev);
        if (checked) {
          next.add(permissionId);
          if (isWritePermission(permission)) {
            const readPermissionId = permissionIdByKey.get(
              `${permission.resource}:read`,
            );
            if (readPermissionId) {
              next.add(readPermissionId);
            }
          }
        } else {
          next.delete(permissionId);
        }

        return normalizePermissionSelection([...next], displayPermissions);
      });
    },
    [
      displayPermissions,
      isReadPermissionLocked,
      permissionById,
      permissionIdByKey,
    ],
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

  const permissionsByResourceAndAction = useMemo(() => {
    const grouped = new Map<string, Map<string, DesignPermissionWithId>>();

    for (const permission of displayPermissions) {
      const resourceMap =
        grouped.get(permission.resource) ??
        new Map<string, DesignPermissionWithId>();
      resourceMap.set(permission.action, permission);
      grouped.set(permission.resource, resourceMap);
    }

    return grouped;
  }, [displayPermissions]);

  const permissionGroupSummaries = useMemo(() => {
    return new Map(
      PERMISSION_GROUPS.map((group) => {
        const groupPermissionIds = group.resources.flatMap((resource) => {
          const resourcePermissions = permissionsByResource.get(resource) ?? [];
          return resourcePermissions.flatMap((permission) =>
            permission.id !== null ? [permission.id] : [],
          );
        });
        const selectedCount = groupPermissionIds.filter((permissionId) =>
          selectedPermissionSet.has(permissionId),
        ).length;

        return [
          group.key,
          {
            selectedCount,
            totalCount: groupPermissionIds.length,
          },
        ];
      }),
    );
  }, [permissionsByResource, selectedPermissionSet]);

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

  const filteredUnassignedUserIds = useMemo(
    () => filteredUnassignedUsers.map((user) => user.id),
    [filteredUnassignedUsers],
  );

  const selectedUserForAssignment = selectedUserId
    ? availableUsersById.get(selectedUserId)
    : undefined;
  const canAddSelectedUser = selectedUserForAssignment != null;

  const visibleAssignedUsers = useMemo(
    () => assignedUsers.slice(0, visibleAssignedCount),
    [assignedUsers, visibleAssignedCount],
  );

  const hasMoreAssignedUsers = visibleAssignedCount < assignedUsers.length;

  useEffect(() => {
    if (displayPermissions.length === 0) return;

    if (mode === "create" && !didApplyCreateDefaultsRef.current) {
      const defaultPermissionIds = displayPermissions.flatMap((permission) =>
        permission.id !== null &&
        DEFAULT_CREATE_PERMISSION_KEYS.has(getPermissionKey(permission))
          ? [permission.id]
          : [],
      );

      if (defaultPermissionIds.length > 0) {
        didApplyCreateDefaultsRef.current = true;
        setSelectedPermissions((prev) =>
          normalizePermissionSelection(
            [...new Set([...prev, ...defaultPermissionIds])],
            displayPermissions,
          ),
        );
      }

      return;
    }

    if (mode === "edit") {
      setSelectedPermissions((prev) => {
        const normalized = normalizePermissionSelection(
          prev,
          displayPermissions,
        );
        const hasSameSelection =
          normalized.length === prev.length &&
          normalized.every(
            (permissionId, index) => permissionId === prev[index],
          );

        return hasSameSelection ? prev : normalized;
      });
    }
  }, [displayPermissions, mode]);

  useEffect(() => {
    if (mode !== "edit" || didApplyEditOpenGroupsRef.current) return;
    if (displayPermissions.length === 0) return;

    didApplyEditOpenGroupsRef.current = true;
    const selectedResources = new Set(
      displayPermissions.flatMap((permission) =>
        permission.id !== null && selectedPermissionSet.has(permission.id)
          ? [permission.resource]
          : [],
      ),
    );

    setOpenPermissionGroups({
      core:
        selectedResources.size === 0 ||
        PERMISSION_GROUPS[0].resources.some((resource) =>
          selectedResources.has(resource),
        ),
      manage: PERMISSION_GROUPS[1].resources.some((resource) =>
        selectedResources.has(resource),
      ),
      ai: PERMISSION_GROUPS[2].resources.some((resource) =>
        selectedResources.has(resource),
      ),
    });
  }, [displayPermissions, mode, selectedPermissionSet]);

  useEffect(() => {
    latestNameRef.current = name;
  }, [name]);

  useEffect(() => {
    latestDescriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    latestDisplayPermissionsRef.current = displayPermissions;
    latestPermissionIdsRef.current = normalizePermissionSelection(
      selectedPermissions,
      displayPermissions,
    );
  }, [displayPermissions, selectedPermissions]);

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

  const handleUserSearchChange = useCallback(
    (nextValue: string): void => {
      if (ignoredUserSearchValuesRef.current.has(nextValue)) {
        ignoredUserSearchValuesRef.current.delete(nextValue);
        return;
      }

      ignoredUserSearchValuesRef.current.clear();
      setUserSearch(nextValue);
      setSelectedUserId((prev) => {
        const selectedUser = prev ? availableUsersById.get(prev) : undefined;
        return selectedUser && nextValue.trim() === selectedUser.name
          ? prev
          : "";
      });
    },
    [availableUsersById],
  );

  const selectUserForAssignment = useCallback(
    (userId: string): void => {
      const nextUser = availableUsersById.get(userId);
      if (!nextUser) {
        setSelectedUserId("");
        return;
      }

      ignoredUserSearchValuesRef.current = new Set(["", userId]);
      setSelectedUserId(userId);
      setUserSearch(nextUser.name);
      setIsUserComboboxOpen(false);
    },
    [availableUsersById],
  );

  const handleUserSelectionChange = useCallback(
    (nextValue: string | string[] | null | undefined): void => {
      if (typeof nextValue !== "string") {
        setSelectedUserId("");
        return;
      }

      selectUserForAssignment(nextValue);
    },
    [selectUserForAssignment],
  );

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
        permissionIds: normalizePermissionSelection(
          latestPermissionIdsRef.current,
          latestDisplayPermissionsRef.current,
        ),
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
                <h2
                  id="role-form-display-heading"
                  className="text-sm font-semibold"
                >
                  Role Details
                </h2>
              </CardTitle>
              <CardDescription>
                Name this role and define a short description.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <RequiredLabel htmlFor="roleName">Role Name</RequiredLabel>
                <Input
                  id="roleName"
                  aria-label="Role Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter role name"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Enter role description"
                  rows={3}
                  className="resize-none"
                  disabled={isSubmitting}
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
                <h2
                  id="role-form-permissions-heading"
                  className="text-sm font-semibold"
                >
                  Permissions
                </h2>
              </CardTitle>
              <CardDescription>
                Choose what actions this role can perform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="flex flex-col gap-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const resources = group.resources.filter(
                      (resource) =>
                        (permissionsByResource.get(resource)?.length ?? 0) > 0,
                    );
                    const summary = permissionGroupSummaries.get(group.key);
                    if (resources.length === 0) return null;

                    return (
                      <Collapsible
                        key={group.key}
                        open={openPermissionGroups[group.key]}
                        onOpenChange={(open) =>
                          setOpenPermissionGroups((prev) => ({
                            ...prev,
                            [group.key]: open,
                          }))
                        }
                        className="overflow-hidden rounded-md border border-border"
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-between gap-3 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="text-sm font-semibold">
                                {group.label}
                              </span>
                              <Badge variant="outline">
                                {summary?.selectedCount ?? 0} selected
                              </Badge>
                            </span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              {summary?.totalCount ?? 0} permissions
                              <IconChevronDown
                                className={cn(
                                  "size-4 transition-transform",
                                  openPermissionGroups[group.key]
                                    ? "rotate-180"
                                    : "",
                                )}
                              />
                            </span>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border">
                            <div className="hidden grid-cols-[minmax(9rem,1fr)_repeat(5,minmax(5.25rem,6rem))] items-center gap-2 border-b border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
                              <span>Resource</span>
                              {PERMISSION_ACTION_ORDER.map((action) => (
                                <span key={action} className="text-center">
                                  {formatPermissionActionLabel(action)}
                                </span>
                              ))}
                            </div>
                            <div className="divide-y divide-border">
                              {resources.map((resource) => {
                                const permissionsByAction =
                                  permissionsByResourceAndAction.get(resource);
                                if (!permissionsByAction) return null;

                                return (
                                  <div
                                    key={resource}
                                    className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(9rem,1fr)_repeat(5,minmax(5.25rem,6rem))] md:items-center md:gap-2"
                                  >
                                    <div className="flex min-w-0 items-center justify-between gap-2 md:justify-start">
                                      <span className="text-sm font-medium">
                                        {formatPermissionResourceLabel(
                                          resource,
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground md:hidden">
                                        {
                                          Array.from(
                                            permissionsByAction.values(),
                                          ).filter(
                                            (permission) =>
                                              permission.id !== null &&
                                              selectedPermissionSet.has(
                                                permission.id,
                                              ),
                                          ).length
                                        }{" "}
                                        selected
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:contents">
                                      {PERMISSION_ACTION_ORDER.map((action) => {
                                        const permission =
                                          permissionsByAction.get(action);
                                        if (!permission) {
                                          return (
                                            <span
                                              key={action}
                                              aria-hidden="true"
                                              className="hidden h-8 md:block"
                                            />
                                          );
                                        }

                                        const label =
                                          formatPermissionReadableLabel(
                                            permission,
                                          );
                                        const checked =
                                          permission.id !== null &&
                                          selectedPermissionSet.has(
                                            permission.id,
                                          );
                                        const disabled =
                                          permission.id === null ||
                                          isSubmitting ||
                                          isReadPermissionLocked(permission);
                                        const inputId = `role-permission-${permission.resource}-${permission.action}`;

                                        return (
                                          <div
                                            key={action}
                                            className={cn(
                                              "flex min-h-8 items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 md:justify-center md:border-transparent md:bg-transparent md:px-0 md:py-0",
                                              disabled
                                                ? "opacity-60"
                                                : "hover:bg-muted/30 md:hover:bg-transparent",
                                            )}
                                          >
                                            <Label
                                              htmlFor={inputId}
                                              className="text-xs font-medium md:sr-only"
                                            >
                                              {formatPermissionActionLabel(
                                                action,
                                              )}
                                            </Label>
                                            <div className="flex items-center gap-1.5">
                                              <Checkbox
                                                id={inputId}
                                                aria-label={label}
                                                checked={checked}
                                                disabled={disabled}
                                                onCheckedChange={(
                                                  nextChecked,
                                                ) =>
                                                  handlePermissionToggle(
                                                    permission.id,
                                                    nextChecked === true,
                                                  )
                                                }
                                              />
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    type="button"
                                                    aria-label={`${label} details`}
                                                    className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                                  >
                                                    <IconInfoCircle className="size-3.5" />
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                  side="top"
                                                  className="max-w-72"
                                                >
                                                  <span>
                                                    {formatPermissionTooltipDescription(
                                                      permission,
                                                    )}
                                                  </span>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </TooltipProvider>
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
                <h2
                  id="role-form-users-heading"
                  className="text-sm font-semibold"
                >
                  Manage Users ({assignedUsers.length})
                </h2>
              </CardTitle>
              <CardDescription>
                Assign users who should inherit this role.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {canReadUsers ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="roleUserCombobox">Assign User</Label>
                    <Combobox
                      open={isUserComboboxOpen}
                      onOpenChange={setIsUserComboboxOpen}
                      value={selectedUserId}
                      items={filteredUnassignedUserIds}
                      filteredItems={filteredUnassignedUserIds}
                      inputValue={userSearch}
                      onInputValueChange={(nextValue) =>
                        handleUserSearchChange(nextValue ?? "")
                      }
                      onValueChange={handleUserSelectionChange}
                      disabled={isSubmitting}
                    >
                      <ComboboxInput
                        id="roleUserCombobox"
                        className="w-full"
                        showClear
                        placeholder="Search users by name, username, or email"
                        disabled={isSubmitting}
                      />
                      <ComboboxContent>
                        <ComboboxVirtualList
                          items={filteredUnassignedUsers}
                          hasMore={hasMoreUserOptions}
                          isLoadingMore={isUserOptionsLoadingMore}
                          onLoadMore={loadMoreUserOptions}
                          getItemKey={(user) => user.id}
                          renderItem={(user) => (
                            <ComboboxItem
                              value={user.id}
                              onPointerDownCapture={(event) => {
                                event.preventDefault();
                                selectUserForAssignment(user.id);
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                selectUserForAssignment(user.id);
                              }}
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">
                                  {user.name}
                                </span>
                                <span className="truncate text-muted-foreground">
                                  @{user.username}
                                  {user.email ? ` · ${user.email}` : ""}
                                </span>
                              </span>
                            </ComboboxItem>
                          )}
                        />
                        <ComboboxEmpty>No matching users.</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddUser}
                    disabled={!canAddSelectedUser || isSubmitting}
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
                <div className="flex flex-col gap-2">
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
                        disabled={!canReadUsers || isSubmitting}
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
                      disabled={isSubmitting}
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
