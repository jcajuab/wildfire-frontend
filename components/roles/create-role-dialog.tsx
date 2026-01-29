"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

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
import type { Permission, CreateRoleFormData } from "@/types/role";

interface CreateRoleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly permissions: readonly Permission[];
  readonly onCreate: (data: CreateRoleFormData) => void;
}

function CreateRoleDialogContent({
  permissions,
  onCreate,
  onOpenChange,
}: Omit<CreateRoleDialogProps, "open">): React.ReactElement {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
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
          <IconPlus className="size-5" />
          Create Role
        </DialogTitle>
        <DialogDescription>
          Create a new role with specific permissions.
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
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionToggle(permission.id, checked === true)
                      }
                    />
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor={permission.id}
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
          Create Role
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  permissions,
  onCreate,
}: CreateRoleDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <CreateRoleDialogContent
            key="create-role-form"
            permissions={permissions}
            onCreate={onCreate}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
