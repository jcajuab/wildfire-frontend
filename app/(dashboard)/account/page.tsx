"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import Image from "next/image";
import { useState, useRef } from "react";
import { IconUserSquareRounded, IconUser } from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import {
  changePassword,
  deleteCurrentUser,
  updateCurrentUserProfile,
  uploadAvatar,
} from "@/lib/api-client";
import { toast } from "sonner";

// Common timezones
const timezones = [
  "Asia - Taipei",
  "Asia - Tokyo",
  "Asia - Singapore",
  "Asia - Hong Kong",
  "America - New York",
  "America - Los Angeles",
  "America - Chicago",
  "Europe - London",
  "Europe - Paris",
  "Europe - Berlin",
  "Australia - Sydney",
  "Pacific - Auckland",
] as const;

const defaultTimezone = "Asia - Taipei";

export default function AccountPage(): ReactElement {
  const { user, logout, updateSession } = useAuth();
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(
    user?.name?.split(/\s+/)[0] ?? "Admin",
  );
  const [lastName, setLastName] = useState(
    user?.name?.split(/\s+/).slice(1).join(" ") ?? "",
  );
  const [timezone, setTimezone] = useState(user?.timezone ?? defaultTimezone);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const handleChangeProfilePicture = (): void => {
    profilePictureInputRef.current?.click();
  };

  const handleProfilePictureSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ] as const;
    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (!allowedTypes.includes(file.type as (typeof allowedTypes)[number])) {
      toast.error(
        "Use a JPEG, PNG, WebP or GIF image. Some image types from your device are not supported.",
      );
      return;
    }
    if (file.size > maxBytes) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }

    setIsAvatarUploading(true);
    try {
      const response = await uploadAvatar(undefined, file);
      updateSession(response);
      toast.success("Profile picture updated.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to upload profile picture.";
      toast.error(message);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleChangePassword = (): void => {
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleLogOut = async (): Promise<void> => {
    await logout();
  };

  const handleDeleteAccount = (): void => {
    setIsDeleteDialogOpen(true);
  };

  const handleSaveChanges = async (): Promise<void> => {
    const name = [firstName.trim(), lastName.trim()]
      .filter((part) => part.length > 0)
      .join(" ");
    try {
      const response = await updateCurrentUserProfile(undefined, {
        name,
        timezone: timezone || null,
      });
      updateSession(response);
      toast.success("Account settings saved.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save account settings.";
      toast.error(message);
    }
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      await changePassword(undefined, {
        currentPassword,
        newPassword,
      });
      toast.success("Password updated.");
      setIsPasswordDialogOpen(false);
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
    }
  };

  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0;

  const accountDisplayName = [firstName.trim(), lastName.trim()]
    .filter((part) => part.length > 0)
    .join(" ");

  const accountNameForDialog =
    accountDisplayName.length > 0
      ? accountDisplayName
      : (user?.name ?? "this account");

  const handleDeleteAccountConfirm = async (): Promise<void> => {
    try {
      await deleteCurrentUser();
      await logout();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account.";
      toast.error(message);
    }
  };

  return (
    <DashboardPage.Root>
      <DashboardPage.Header title="Account" />

      <DashboardPage.Body>
        <DashboardPage.Content
          key={user?.id ?? "anonymous"}
          className="overflow-auto px-0 pb-0"
        >
          {/* Account Information Section */}
          <div className="border-b px-8 py-4">
            <div className="flex items-center gap-2">
              <IconUserSquareRounded className="size-5" />
              <h2 className="text-base font-semibold">Account Information</h2>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-6 px-8 py-6">
            {/* Profile Picture */}
            <div className="grid grid-cols-[180px_1fr] items-start gap-4">
              <Label className="pt-2 text-right text-sm font-medium text-muted-foreground">
                Profile Picture
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt="Profile"
                      width={48}
                      height={48}
                      className="size-12 object-cover"
                      unoptimized
                    />
                  ) : (
                    <IconUser className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangeProfilePicture}
                    disabled={isAvatarUploading}
                  >
                    {isAvatarUploading
                      ? "Uploading…"
                      : "Change Profile Picture"}
                  </Button>
                  <input
                    ref={profilePictureInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleProfilePictureSelected}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP or GIF. Max 2 MB. Recommended: 320 × 320 px.
                  </p>
                </div>
              </div>
            </div>

            {/* First Name */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <Label
                htmlFor="firstName"
                className="text-right text-sm font-medium text-muted-foreground"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="max-w-lg"
              />
            </div>

            {/* Last Name */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <Label
                htmlFor="lastName"
                className="text-right text-sm font-medium text-muted-foreground"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="max-w-lg"
              />
            </div>

            {/* Email (read-only) */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <Label className="text-right text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <p className="text-sm">{user?.email ?? "—"}</p>
            </div>

            {/* Password */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <Label className="text-right text-sm font-medium text-muted-foreground">
                Password
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                className="w-fit"
              >
                Change Password
              </Button>
            </div>

            {/* Time Zone */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <Label className="text-right text-sm font-medium text-muted-foreground">
                Time Zone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="max-w-lg">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-8 pb-6">
            <div />
            <div className="max-w-lg flex justify-end gap-2">
              <Button variant="default" onClick={handleSaveChanges}>
                Save Changes
              </Button>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleLogOut}
              >
                Log Out
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </div>
          </div>
        </DashboardPage.Content>
      </DashboardPage.Body>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) setPasswordError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handlePasswordSubmit}>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one (at least 8
                characters).
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmitPassword}>
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete account?"
        description={`This will permanently remove ${accountNameForDialog}. You can log out instead if you only want to end this session.`}
        confirmLabel="Delete account"
        onConfirm={handleDeleteAccountConfirm}
      />
    </DashboardPage.Root>
  );
}
