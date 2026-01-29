"use client";

import { useState } from "react";
import { IconEdit } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Role, Permission, EditRoleFormData } from "@/types/role";

interface EditRoleDialogProps {
  readonly role: Role | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly permissions: readonly Permission[];
  readonly onSave: (roleId: string, data: EditRoleFormData) => void;
}

interface EditRoleFormProps {
  readonly role: Role;
  readonly permissions: readonly Permission[];
  readonly onSave: (roleId: string, data: EditRoleFormData) => void;
  readonly onOpenChange: (open: boolean) => void;
}

function EditRoleForm({
  role,
  permissions,
  onSave,
  onOpenChange,
}: EditRoleFormProps): React.ReactElement {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role.permissions.map((p) => p.id),
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(role.id, {
      name: name.trim(),
      description: description.trim(),
      permissionIds: selectedPermissions,
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

  // Group permissions by category
  const permissionsByCategory = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const isValid = name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <IconEdit className="size-5" />
          Edit Role
        </DialogTitle>
        <DialogDescription>
          Update the role name, description, and permissions.
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Content Manager"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this role can do..."
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label>Permissions</Label>
          {Object.entries(permissionsByCategory).map(([category, perms]) => (
            <div key={category} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {category}
              </p>
              <div className="flex flex-col gap-2 pl-2">
                {perms.map((permission) => (
                  <div key={permission.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`edit-${permission.id}`}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionToggle(permission.id, checked === true)
                      }
                    />
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor={`edit-${permission.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {permission.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  permissions,
  onSave,
}: EditRoleDialogProps): React.ReactElement {
  if (!role) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role Not Found</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <EditRoleForm
            key={role.id}
            role={role}
            permissions={permissions}
            onSave={onSave}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
