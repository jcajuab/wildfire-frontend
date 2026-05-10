import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RequiredLabel } from "@/components/common/required-label";
import { Button } from "@/components/ui/button";

const controlClass = "h-10 w-full";
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()-_=+])[A-Za-z\d@$!%*?&#^()-_=+]{12,}$/;

interface ChangePasswordDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
}: ChangePasswordDialogProps): ReactElement {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError(
        "Password must include uppercase, lowercase, number, and special character.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      await onSubmit({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password.";
      setPasswordError(
        message.toLowerCase().includes("current")
          ? "Current password is incorrect."
          : message,
      );
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !isPasswordSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPasswordSubmitting) return;
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setPasswordError(null);
          setIsPasswordSubmitting(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handlePasswordSubmit}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update the password used to sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <RequiredLabel htmlFor="current-password">
                Current Password
              </RequiredLabel>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={controlClass}
              />
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="new-password">New Password</RequiredLabel>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={controlClass}
              />
              <p className="text-xs text-muted-foreground">
                Use at least 12 characters with uppercase, lowercase, number,
                and special character.
              </p>
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="confirm-password">
                Confirm New Password
              </RequiredLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={controlClass}
              />
            </div>
            {passwordError ? (
              <p role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPasswordSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmitPassword}>
              {isPasswordSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
