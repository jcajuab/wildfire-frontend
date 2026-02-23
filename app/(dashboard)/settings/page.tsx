"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconPencil, IconUser } from "@tabler/icons-react";

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
import { Separator } from "@/components/ui/separator";
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
  getDeviceRuntimeSettings,
  updateCurrentUserProfile,
  updateDeviceRuntimeSettings,
  uploadAvatar,
} from "@/lib/api-client";
import { useCan } from "@/hooks/use-can";
import { toast } from "sonner";

const legacyTimezoneMap: Readonly<Record<string, string>> = {
  "Asia - Taipei": "Asia/Taipei",
  "Asia - Tokyo": "Asia/Tokyo",
  "Asia - Singapore": "Asia/Singapore",
  "Asia - Hong Kong": "Asia/Hong_Kong",
  "America - New York": "America/New_York",
  "America - Los Angeles": "America/Los_Angeles",
  "America - Chicago": "America/Chicago",
  "Europe - London": "Europe/London",
  "Europe - Paris": "Europe/Paris",
  "Europe - Berlin": "Europe/Berlin",
  "Australia - Sydney": "Australia/Sydney",
  "Pacific - Auckland": "Pacific/Auckland",
};

const timezones = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

const defaultTimezone = "Asia/Taipei";

const normalizeTimezone = (value?: string | null): string =>
  value == null || value.length === 0
    ? defaultTimezone
    : (legacyTimezoneMap[value] ?? value);

export default function SettingsPage(): ReactElement {
  const { user, logout, updateSession } = useAuth();
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(
    user?.name?.split(/\s+/)[0] ?? "Admin",
  );
  const [lastName, setLastName] = useState(
    user?.name?.split(/\s+/).slice(1).join(" ") ?? "",
  );
  const [savedFirstName, setSavedFirstName] = useState(
    user?.name?.split(/\s+/)[0] ?? "Admin",
  );
  const [savedLastName, setSavedLastName] = useState(
    user?.name?.split(/\s+/).slice(1).join(" ") ?? "",
  );
  const [timezone, setTimezone] = useState(normalizeTimezone(user?.timezone));
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<
    "firstName" | "lastName" | null
  >(null);
  const [scrollPxPerSecond, setScrollPxPerSecond] = useState("24");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [isLoadingRuntimeSettings, setIsLoadingRuntimeSettings] =
    useState(false);
  const [isSavingRuntimeSettings, setIsSavingRuntimeSettings] = useState(false);
  const canReadRuntimeSettings = useCan("settings:read");
  const canUpdateRuntimeSettings = useCan("settings:update");
  const avatarUrl = user?.avatarUrl ?? null;
  const sectionTitleClass = "text-base font-semibold tracking-tight";

  useEffect(() => {
    if (!canReadRuntimeSettings) return;
    let cancelled = false;
    setIsLoadingRuntimeSettings(true);
    void getDeviceRuntimeSettings()
      .then((result) => {
        if (cancelled) return;
        setScrollPxPerSecond(String(result.scrollPxPerSecond));
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load device runtime settings.";
        toast.error(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingRuntimeSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canReadRuntimeSettings]);

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

  const saveProfileName = async (
    nextFirstName: string,
    nextLastName: string,
  ): Promise<void> => {
    const name = [nextFirstName.trim(), nextLastName.trim()]
      .filter((part) => part.length > 0)
      .join(" ");
    try {
      const response = await updateCurrentUserProfile(undefined, {
        name,
      });
      updateSession(response);
      setSavedFirstName(nextFirstName);
      setSavedLastName(nextLastName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(message);
    }
  };

  const handleTimezoneChange = async (nextTimezone: string): Promise<void> => {
    const previousTimezone = timezone;
    setTimezone(nextTimezone);
    setIsSavingTimezone(true);
    try {
      const response = await updateCurrentUserProfile(undefined, {
        timezone: nextTimezone || null,
      });
      updateSession(response);
    } catch (err) {
      setTimezone(previousTimezone);
      const message =
        err instanceof Error ? err.message : "Failed to update time zone.";
      toast.error(message);
    } finally {
      setIsSavingTimezone(false);
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

  const handleSaveRuntimeSettings = async (): Promise<void> => {
    if (!canUpdateRuntimeSettings) return;
    const parsed = Number.parseInt(scrollPxPerSecond, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
      toast.error("Auto-scroll speed must be an integer between 1 and 200.");
      return;
    }
    setIsSavingRuntimeSettings(true);
    try {
      const result = await updateDeviceRuntimeSettings({
        scrollPxPerSecond: parsed,
      });
      setScrollPxPerSecond(String(result.scrollPxPerSecond));
      toast.success("Runtime auto-scroll setting updated.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update runtime auto-scroll setting.";
      toast.error(message);
    } finally {
      setIsSavingRuntimeSettings(false);
    }
  };

  return (
    <DashboardPage.Root>
      <DashboardPage.Header title="Settings" />

      <DashboardPage.Body>
        <DashboardPage.Content
          key={user?.id ?? "anonymous"}
          className="overflow-visible px-8 py-4"
        >
          <div className="mx-auto w-full max-w-5xl">
            <section className="space-y-4 py-6">
              <div>
                <h2 className={sectionTitleClass}>Account Information</h2>
              </div>

              <div className="grid grid-cols-2 items-start gap-x-8 gap-y-4">
                <div className="text-sm text-muted-foreground">
                  Profile Picture
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleChangeProfilePicture}
                    disabled={isAvatarUploading}
                    className="group relative size-12 overflow-hidden rounded-full border-0 bg-muted p-0 hover:opacity-90"
                    aria-label="Change profile picture"
                  >
                    {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="size-12 object-cover"
                        unoptimized
                        onError={() => setFailedAvatarUrl(avatarUrl)}
                      />
                    ) : (
                      <IconUser className="size-6 text-muted-foreground" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <IconPencil className="size-3.5" />
                    </span>
                  </Button>
                </div>
                <input
                  ref={profilePictureInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleProfilePictureSelected}
                  className="hidden"
                />

                <div className="text-sm text-muted-foreground">First Name</div>
                <div className="w-48">
                  {editingField === "firstName" ? (
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => {
                        setEditingField(null);
                        void saveProfileName(firstName, lastName);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setEditingField(null);
                          void saveProfileName(firstName, lastName);
                        }
                        if (event.key === "Escape") {
                          setFirstName(savedFirstName);
                          setEditingField(null);
                        }
                      }}
                      autoFocus
                      className="w-full"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => setEditingField("firstName")}
                      className="group w-full justify-between gap-2 pr-2"
                    >
                      <span>{firstName || "Set first name"}</span>
                      <IconPencil className="size-3.5 text-muted-foreground/80" />
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">Last Name</div>
                <div className="w-48">
                  {editingField === "lastName" ? (
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => {
                        setEditingField(null);
                        void saveProfileName(firstName, lastName);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setEditingField(null);
                          void saveProfileName(firstName, lastName);
                        }
                        if (event.key === "Escape") {
                          setLastName(savedLastName);
                          setEditingField(null);
                        }
                      }}
                      autoFocus
                      className="w-full"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => setEditingField("lastName")}
                      className="group w-full justify-between gap-2 pr-2"
                    >
                      <span>{lastName || "Set last name"}</span>
                      <IconPencil className="size-3.5 text-muted-foreground/80" />
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">Email</div>
                <p className="pt-2 text-sm">{user?.email ?? "-"}</p>

                <div className="text-sm text-muted-foreground">Password</div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangePassword}
                    className="w-fit min-w-48"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4 py-6">
              <div>
                <h2 className={sectionTitleClass}>System Settings</h2>
              </div>

              <div className="grid grid-cols-2 items-start gap-x-8 gap-y-4">
                <div className="text-sm text-muted-foreground">Time Zone</div>
                <div className="w-full">
                  <Select value={timezone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger
                      className="w-fit min-w-48"
                      disabled={isSavingTimezone}
                    >
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canReadRuntimeSettings ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Auto Scroll
                    </div>
                    <div className="w-full">
                      <Input
                        id="runtime-scroll-speed"
                        type="number"
                        min={1}
                        max={200}
                        value={scrollPxPerSecond}
                        onChange={(e) => setScrollPxPerSecond(e.target.value)}
                        disabled={
                          isLoadingRuntimeSettings ||
                          isSavingRuntimeSettings ||
                          !canUpdateRuntimeSettings
                        }
                        className="w-fit min-w-48"
                        onBlur={() => {
                          void handleSaveRuntimeSettings();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSaveRuntimeSettings();
                          }
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <Separator />

            <section className="space-y-4 py-6">
              <h2 className="text-lg font-semibold tracking-tight text-destructive">
                Danger Zone
              </h2>
              <div className="overflow-hidden rounded-lg border border-destructive/40">
                <div className="flex items-start justify-between gap-4 border-b border-destructive/25 px-4 py-4">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold">
                      Log out this session
                    </p>
                    <p className="text-sm text-muted-foreground">
                      End your current session on this device.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleLogOut}
                  >
                    Log Out
                  </Button>
                </div>

                <div className="flex items-start justify-between gap-4 px-4 py-4">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold">Delete this account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account. This cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </section>
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
