"use client";

import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";
import { IconUserPlus, IconInfoCircle, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  mergeDesignPermissionsWithApi,
  type DesignPermissionWithId,
} from "@/lib/design-permissions";
import {
  formatPermissionId,
  formatPermissionReadableLabel,
} from "@/lib/format-permission";
import type { Role, Permission, RoleUser, RoleFormData } from "@/types/role";

const HIGH_RISK_TARGET_THRESHOLD = 20;
const MAX_VISIBLE_UNASSIGNED_USERS = 100;
const INITIAL_ASSIGNED_VISIBLE_COUNT = 25;
const ASSIGNED_VISIBLE_COUNT_STEP = 25;

interface RoleDialogProps {
  readonly mode: "create" | "edit";
  readonly role?: Role | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** When true (or create mode), form is shown; when false in edit mode, loading state is shown. */
  readonly editDataReady?: boolean;
  readonly permissions: readonly Permission[];
  readonly availableUsers: readonly RoleUser[];
  /** Initial permission IDs when editing (from API or context). */
  readonly initialPermissionIds?: readonly string[];
  /** Initial user IDs assigned to role when editing (from API or context). */
  readonly initialUserIds?: readonly string[];
  readonly onSubmit: (data: RoleFormData) => Promise<void> | void;
}

interface RoleFormProps {
  readonly mode: "create" | "edit";
  readonly initialRole?: Role | null;
  readonly permissions: readonly Permission[];
  readonly availableUsers: readonly RoleUser[];
  readonly initialPermissionIds: readonly string[];
  readonly initialUserIds: readonly string[];
  readonly onSubmit: (data: RoleFormData) => Promise<void> | void;
  readonly onOpenChange: (open: boolean) => void;
}

function RoleForm({
  mode,
  initialRole,
  permissions,
  availableUsers,
  initialPermissionIds,
  initialUserIds,
  onSubmit,
  onOpenChange,
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
    mode === "edit" && Array.isArray(initialUserIds)
      ? availableUsers.filter((u) => initialUserIds.includes(u.id))
      : [],
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(
    INITIAL_ASSIGNED_VISIBLE_COUNT,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policyVersionText, setPolicyVersionText] = useState<string>("");
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setFormError(null);

    const isHighRiskOperation =
      selectedPermissions.length > HIGH_RISK_TARGET_THRESHOLD ||
      assignedUsers.length > HIGH_RISK_TARGET_THRESHOLD;
    const parsedPolicyVersion = Number.parseInt(policyVersionText.trim(), 10);
    const policyVersion =
      Number.isInteger(parsedPolicyVersion) && parsedPolicyVersion > 0
        ? parsedPolicyVersion
        : undefined;

    if (isHighRiskOperation) {
      if (policyVersion === undefined) {
        setFormError(
          `Policy version is required when changing more than ${HIGH_RISK_TARGET_THRESHOLD} targets.`,
        );
        return;
      }
      if (!highRiskConfirmed) {
        setFormError("Please confirm this high-impact governance change.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        permissionIds: selectedPermissions,
        userIds: assignedUsers.map((u) => u.id),
        policyVersion,
        highRiskConfirmed,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (
    permissionId: string | null,
    checked: boolean,
  ): void => {
    if (permissionId == null) return;
    if (checked) {
      setSelectedPermissions((prev) => [...prev, permissionId]);
    } else {
      setSelectedPermissions((prev) =>
        prev.filter((id) => id !== permissionId),
      );
    }
  };

  const displayPermissions: DesignPermissionWithId[] = useMemo(
    () => mergeDesignPermissionsWithApi(permissions),
    [permissions],
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
        user.email.toLowerCase().includes(normalizedUserSearch)
      );
    });
  }, [normalizedUserSearch, unassignedUsers]);

  const visibleUnassignedUsers = useMemo(
    () => filteredUnassignedUsers.slice(0, MAX_VISIBLE_UNASSIGNED_USERS),
    [filteredUnassignedUsers],
  );

  const visibleAssignedUsers = useMemo(
    () => assignedUsers.slice(0, visibleAssignedCount),
    [assignedUsers, visibleAssignedCount],
  );

  const hasMoreAssignedUsers = visibleAssignedCount < assignedUsers.length;

  const handleAddUser = (): void => {
    if (!selectedUserId) return;
    const user = availableUsersById.get(selectedUserId);
    if (!user) return;
    if (assignedUserIdSet.has(user.id)) return;
    setAssignedUsers((prev) => [...prev, user]);
    setSelectedUserId("");
    setUserSearch("");
    setVisibleAssignedCount((prev) => prev + 1);
  };

  const handleRemoveUser = (userId: string): void => {
    setAssignedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const isValid = name.trim().length > 0;
  const isCreate = mode === "create";
  const isHighRiskOperation =
    selectedPermissions.length > HIGH_RISK_TARGET_THRESHOLD ||
    assignedUsers.length > HIGH_RISK_TARGET_THRESHOLD;

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isCreate ? "Create New Role" : "Edit Role"}</DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="display" className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="display" className="flex-1">
            Display
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-1">
            Permissions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1">
            Manage Users ({assignedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Display Tab */}
        <TabsContent value="display" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter role name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-4">
          <div className="flex max-h-[400px] flex-col gap-0 overflow-y-auto">
            <TooltipProvider>
              {displayPermissions.map((perm, index) => (
                <div key={`${perm.resource}:${perm.action}`}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatPermissionReadableLabel(perm)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Permission id for ${formatPermissionReadableLabel(perm)}`}
                            className="inline-flex cursor-help text-muted-foreground"
                          >
                            <IconInfoCircle className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatPermissionId(perm)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={
                        perm.id !== null &&
                        selectedPermissions.includes(perm.id)
                      }
                      disabled={perm.id === null}
                      onCheckedChange={(checked) =>
                        handlePermissionToggle(perm.id, checked)
                      }
                    />
                  </div>
                  {index < displayPermissions.length - 1 && <Separator />}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </TabsContent>

        {/* Manage Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="flex flex-col gap-4">
            {/* Add user row */}
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Search users by name or email"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleUnassignedUsers.length > 0 ? (
                      visibleUnassignedUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No matching users.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddUser}
                  disabled={!selectedUserId}
                >
                  <IconUserPlus className="size-4" />
                  Add User
                </Button>
              </div>
              {filteredUnassignedUsers.length > MAX_VISIBLE_UNASSIGNED_USERS ? (
                <p className="text-xs text-muted-foreground">
                  Showing first {MAX_VISIBLE_UNASSIGNED_USERS} results. Keep
                  typing to narrow the list.
                </p>
              ) : null}
            </div>

            {/* Assigned users list */}
            {assignedUsers.length > 0 && (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {visibleAssignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveUser(user.id)}
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
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        This change will assign{" "}
        <span className="font-medium text-foreground">
          {selectedPermissions.length}
        </span>{" "}
        permissions and{" "}
        <span className="font-medium text-foreground">
          {assignedUsers.length}
        </span>{" "}
        users to this role.
      </div>

      <div className="mt-3 rounded-md border border-border p-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="policyVersion">Policy version</Label>
          <Input
            id="policyVersion"
            type="number"
            min={1}
            step={1}
            value={policyVersionText}
            onChange={(e) => setPolicyVersionText(e.target.value)}
            placeholder="e.g. 12"
          />
          <p className="text-xs text-muted-foreground">
            Optional by default; required for high-impact changes.
          </p>
        </div>
      </div>

      {isHighRiskOperation ? (
        <div className="bg-[var(--warning-muted)] text-[var(--warning-foreground)] mt-3 rounded-md border border-border p-3">
          <p className="text-xs">
            High-impact change detected. Enter policy version and confirm before
            saving.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-white px-3 py-2">
            <p className="text-xs text-muted-foreground">
              I confirm this governance update is reviewed and approved.
            </p>
            <Switch
              checked={highRiskConfirmed}
              onCheckedChange={setHighRiskConfirmed}
            />
          </div>
        </div>
      ) : null}

      {formError ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {formError}
        </p>
      ) : null}

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Saving…" : isCreate ? "Create" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RoleDialog({
  mode,
  role,
  open,
  onOpenChange,
  editDataReady = true,
  permissions,
  availableUsers,
  initialPermissionIds = [],
  initialUserIds = [],
  onSubmit,
}: RoleDialogProps): ReactElement {
  const showForm = mode === "create" || editDataReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open &&
          (showForm ? (
            <RoleForm
              key={mode === "edit" && role ? role.id : "create"}
              mode={mode}
              initialRole={role}
              permissions={permissions}
              availableUsers={availableUsers}
              initialPermissionIds={initialPermissionIds}
              initialUserIds={initialUserIds}
              onSubmit={onSubmit}
              onOpenChange={onOpenChange}
            />
          ) : (
            <>
              <DialogTitle className="sr-only">Edit role</DialogTitle>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">Loading permissions…</p>
              </div>
            </>
          ))}
      </DialogContent>
    </Dialog>
  );
}
