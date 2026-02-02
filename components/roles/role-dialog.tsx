"use client";

import { useState } from "react";
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
  formatPermissionId,
  formatPermissionReadableLabel,
} from "@/lib/format-permission";
import type { Role, Permission, RoleUser, RoleFormData } from "@/types/role";

interface RoleDialogProps {
  readonly mode: "create" | "edit";
  readonly role?: Role | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly permissions: readonly Permission[];
  readonly availableUsers: readonly RoleUser[];
  /** Initial permission IDs when editing (from API or context). */
  readonly initialPermissionIds?: readonly string[];
  /** Initial user IDs assigned to role when editing (from API or context). */
  readonly initialUserIds?: readonly string[];
  readonly onSubmit: (data: RoleFormData) => void;
}

interface RoleFormProps {
  readonly mode: "create" | "edit";
  readonly initialRole?: Role | null;
  readonly permissions: readonly Permission[];
  readonly availableUsers: readonly RoleUser[];
  readonly initialPermissionIds: readonly string[];
  readonly initialUserIds: readonly string[];
  readonly onSubmit: (data: RoleFormData) => void;
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
}: RoleFormProps): React.ReactElement {
  const [name, setName] = useState(initialRole?.name ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    mode === "edit" ? [...initialPermissionIds] : [],
  );
  const [assignedUsers, setAssignedUsers] = useState<RoleUser[]>(() =>
    mode === "edit"
      ? availableUsers.filter((u) => initialUserIds.includes(u.id))
      : [],
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      permissionIds: selectedPermissions,
      userIds: assignedUsers.map((u) => u.id),
    });
    onOpenChange(false);
  };

  const handlePermissionToggle = (
    permissionId: string,
    checked: boolean,
  ): void => {
    if (checked) {
      setSelectedPermissions((prev) => [...prev, permissionId]);
    } else {
      setSelectedPermissions((prev) =>
        prev.filter((id) => id !== permissionId),
      );
    }
  };

  const handleAddUser = (): void => {
    if (!selectedUserId) return;
    const user = availableUsers.find((u) => u.id === selectedUserId);
    if (!user) return;
    if (assignedUsers.some((u) => u.id === user.id)) return;
    setAssignedUsers((prev) => [...prev, user]);
    setSelectedUserId("");
  };

  const handleRemoveUser = (userId: string): void => {
    setAssignedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Filter out already assigned users from available users
  const unassignedUsers = availableUsers.filter(
    (u) => !assignedUsers.some((au) => au.id === u.id),
  );

  const isValid = name.trim().length > 0;
  const isCreate = mode === "create";

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
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-4">
          <div className="flex max-h-[400px] flex-col gap-0 overflow-y-auto">
            <TooltipProvider>
              {permissions.map((permission, index) => (
                <div key={permission.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatPermissionReadableLabel(permission)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <IconInfoCircle className="size-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatPermissionId(permission)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionToggle(permission.id, checked)
                      }
                    />
                  </div>
                  {index < permissions.length - 1 && <Separator />}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </TabsContent>

        {/* Manage Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="flex flex-col gap-4">
            {/* Add user row */}
            <div className="flex items-center gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
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

            {/* Assigned users list */}
            {assignedUsers.length > 0 && (
              <div className="flex flex-col gap-2">
                {assignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
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
                    >
                      <IconX className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          {isCreate ? "Create" : "Save"}
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
  permissions,
  availableUsers,
  initialPermissionIds = [],
  initialUserIds = [],
  onSubmit,
}: RoleDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
