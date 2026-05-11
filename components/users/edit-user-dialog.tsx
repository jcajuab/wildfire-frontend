"use client";

import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

import { RequiredLabel } from "@/components/common/required-label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import type { User } from "@/types/user";

export interface EditUserFormData {
  readonly id: string;
  readonly username?: string;
  readonly name: string;
  readonly email: string | null;
}

interface EditUserDialogProps {
  readonly user: User | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (data: EditUserFormData) => Promise<void> | void;
}

function getUserType(user: User): "dcism" | "invited" | "banned" {
  if (user.bannedAt != null || !user.isActive) return "banned";
  return user.isInvitedUser ? "invited" : "dcism";
}

/** Form body keyed by user.id so state resets when editing a different user. */
function EditUserForm({
  user,
  onOpenChange,
  onSubmit,
  onSubmittingChange,
}: {
  user: User;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EditUserFormData) => Promise<void> | void;
  onSubmittingChange?: (submitting: boolean) => void;
}): ReactElement {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === user.id;
  const isDcismUser =
    !user.isInvitedUser && !(user.roles ?? []).some((r) => r.name === "Admin");
  const userType = getUserType(user);
  const userTypeLabel =
    userType === "banned"
      ? "Banned"
      : userType === "invited"
        ? "Invited"
        : "DCISM";
  const usernameLockedReason = isSelf
    ? "You cannot change your own username."
    : isDcismUser
      ? "Username is managed by DCISM and cannot be changed."
      : null;
  const isUsernameLocked = usernameLockedReason !== null;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onSubmittingChange?.(true);
    try {
      await onSubmit({
        id: user.id,
        ...(isDcismUser ? {} : { username: username.trim() }),
        name: name.trim(),
        email: email.trim().length > 0 ? email.trim() : null,
      });
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  };

  const trimmedEmail = email.trim();
  const isEmailValid =
    trimmedEmail.length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isValid =
    name.trim().length > 0 && username.trim().length > 0 && isEmailValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
        <DialogDescription>
          Update user identity details and account access.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-user-name">Name</RequiredLabel>
          <Input
            id="edit-user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
          />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-user-username">Username</RequiredLabel>
          {isUsernameLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Input
                    id="edit-user-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    disabled
                    className="disabled:cursor-help"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                {usernameLockedReason}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Input
              id="edit-user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-user-email">Email</Label>
          <Input
            id="edit-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            aria-invalid={!isEmailValid}
          />
          {!isEmailValid ? (
            <p className="text-xs text-destructive">
              Please enter a valid email address.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-user-type">User Type</Label>
          <Input
            id="edit-user-type"
            type="text"
            value={userTypeLabel}
            disabled
            readOnly
          />
        </div>
      </div>
      <DialogFooter>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guardedOnOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={guardedOnOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        {open && user ? (
          <EditUserForm
            key={user.id}
            user={user}
            onOpenChange={guardedOnOpenChange}
            onSubmit={onSubmit}
            onSubmittingChange={setIsSubmitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
