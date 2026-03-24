"use client";

import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/auth-context";
import type { User } from "@/types/user";

export interface EditUserFormData {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly email: string | null;
  readonly isActive: boolean;
}

interface EditUserDialogProps {
  readonly user: User | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (data: EditUserFormData) => Promise<void> | void;
}

/** Form body keyed by user.id so state resets when editing a different user. */
function EditUserForm({
  user,
  onOpenChange,
  onSubmit,
}: {
  user: User;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EditUserFormData) => Promise<void> | void;
}): ReactElement {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [isActive, setIsActive] = useState(user.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin === true;
  const isSelf = currentUser?.id === user.id;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        id: user.id,
        username: username.trim(),
        name: name.trim(),
        email: email.trim().length > 0 ? email.trim() : null,
        isActive,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && username.trim().length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
        <DialogDescription>
          Update user identity details and account activation status.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-user-name">Name</Label>
          <Input
            id="edit-user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-user-username">Username</Label>
          <Input
            id="edit-user-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            disabled={isSelf}
          />
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              You cannot change your own username.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-user-email">Email</Label>
          <Input
            id="edit-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="edit-user-active">Active</Label>
            <p className="text-sm text-muted-foreground">
              Inactive users cannot sign in.
            </p>
          </div>
          <Switch
            id="edit-user-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={!isAdmin || isSelf}
          />
        </div>
      </div>
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
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
}: EditUserDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && user ? (
          <EditUserForm
            key={user.id}
            user={user}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
