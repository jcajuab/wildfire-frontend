"use client";

import type { ChangeEvent, FormEvent, ReactElement, ReactNode } from "react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconPencil, IconUser, IconX } from "@tabler/icons-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
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
  requestEmailChange,
  updateCurrentUserProfile,
  uploadAvatar,
} from "@/lib/api-client";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import { toast } from "sonner";

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
const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

const isSupportedTimezone = (value: string): boolean =>
  (timezones as readonly string[]).includes(value);

const normalizeTimezone = (value?: string | null): string =>
  typeof value === "string" && isSupportedTimezone(value)
    ? value
    : defaultTimezone;

const splitName = (
  fullName: string | undefined,
): { first: string; last: string } => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Admin";
  const last = parts.slice(1).join(" ");
  return { first, last };
};

interface SettingsFieldProps {
  readonly label: string;
  readonly children: ReactNode;
}

function SettingsField({ label, children }: SettingsFieldProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:items-start">
      <dt className="pt-2 text-sm font-medium text-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-2">{children}</dd>
    </div>
  );
}

interface DirtyFieldActionsProps {
  readonly canConfirm: boolean;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly isSubmitting?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function DirtyFieldActions({
  canConfirm,
  confirmLabel,
  cancelLabel,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: DirtyFieldActionsProps): ReactElement {
  if (!canConfirm) {
    return <></>;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="size-10"
        disabled={isSubmitting}
        onClick={onConfirm}
        aria-label={confirmLabel}
      >
        <IconCheck className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        className="size-10"
        disabled={isSubmitting}
        onClick={onCancel}
        aria-label={cancelLabel}
      >
        <IconX className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default function SettingsPage(): ReactElement {
  const { user, token, logout, updateSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const initialName = splitName(user?.name);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [savedFirstName, setSavedFirstName] = useState(initialName.first);
  const [savedLastName, setSavedLastName] = useState(initialName.last);

  const [emailDraft, setEmailDraft] = useState(user?.email ?? "");
  const [savedEmail, setSavedEmail] = useState(user?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);

  const [timezone, setTimezone] = useState(normalizeTimezone(user?.timezone));
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  const [profileNameError, setProfileNameError] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<
    "firstName" | "lastName" | "email" | null
  >(null);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(
    null,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const avatarUrl = user?.avatarUrl ?? null;
  const pendingEmail = user?.pendingEmail ?? null;
  const displayedEmail = pendingEmail ?? savedEmail;
  const isFirstNameDirty = firstName.trim() !== savedFirstName.trim();
  const isLastNameDirty = lastName.trim() !== savedLastName.trim();
  const isEmailDirty =
    emailDraft.trim().toLowerCase() !== displayedEmail.trim().toLowerCase();

  useEffect(() => {
    const nextName = splitName(user?.name);
    setSavedFirstName(nextName.first);
    setSavedLastName(nextName.last);
    if (editingField !== "firstName") {
      setFirstName(nextName.first);
    }
    if (editingField !== "lastName") {
      setLastName(nextName.last);
    }
  }, [editingField, user?.name]);

  useEffect(() => {
    const nextEmail = user?.email ?? "";
    setSavedEmail(nextEmail);
    if (editingField !== "email") {
      setEmailDraft(nextEmail);
    }
  }, [editingField, user?.email]);

  useEffect(() => {
    setTimezone(normalizeTimezone(user?.timezone));
  }, [user?.timezone]);

  useEffect(() => {
    if (editingField === "firstName") {
      firstNameInputRef.current?.focus();
      return;
    }
    if (editingField === "lastName") {
      lastNameInputRef.current?.focus();
      return;
    }
    if (editingField === "email") {
      emailInputRef.current?.focus();
    }
  }, [editingField]);

  const sectionMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.16, ease: "easeOut" as const },
      };

  const handleChangeProfilePicture = (): void => {
    setProfilePictureError(null);
    profilePictureInputRef.current?.click();
  };

  const handleProfilePictureSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    setProfilePictureError(null);
    event.target.value = "";
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ] as const;
    const maxBytes = 2 * 1024 * 1024;
    if (!allowedTypes.includes(file.type as (typeof allowedTypes)[number])) {
      setProfilePictureError(
        "Use a JPEG, PNG, WebP or GIF image. Some image types from your display are not supported.",
      );
      return;
    }
    if (file.size > maxBytes) {
      setProfilePictureError("Image must be 2 MB or smaller.");
      return;
    }

    setIsAvatarUploading(true);
    try {
      const response = await uploadAvatar(token, file);
      updateSession(response);
      toast.success("Profile picture updated.");
    } catch (err) {
      notifyApiError(err, "Failed to upload profile picture.");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const saveProfileName = async (
    nextFirstName: string,
    nextLastName: string,
  ): Promise<boolean> => {
    const normalizedFirstName = nextFirstName.trim();
    const normalizedLastName = nextLastName.trim();
    const normalizedSavedFirstName = savedFirstName.trim();
    const normalizedSavedLastName = savedLastName.trim();

    setFirstName(normalizedFirstName);
    setLastName(normalizedLastName);

    if (
      normalizedFirstName === normalizedSavedFirstName &&
      normalizedLastName === normalizedSavedLastName
    ) {
      setProfileNameError(null);
      return true;
    }

    const name = [normalizedFirstName, normalizedLastName]
      .filter((part) => part.length > 0)
      .join(" ");
    setIsSavingProfileName(true);
    setProfileNameError(null);
    try {
      const response = await updateCurrentUserProfile(token, { name });
      updateSession(response);
      setSavedFirstName(normalizedFirstName);
      setSavedLastName(normalizedLastName);
      return true;
    } catch (err) {
      setProfileNameError(getApiErrorMessage(err, "Failed to update profile."));
      notifyApiError(err, "Failed to update profile.");
      return false;
    } finally {
      setIsSavingProfileName(false);
    }
  };

  const requestEmailVerification = async (): Promise<boolean> => {
    const normalizedEmail = emailDraft.trim().toLowerCase();
    if (normalizedEmail.length === 0) {
      setEmailError("Email is required.");
      return false;
    }
    if (normalizedEmail === displayedEmail.trim().toLowerCase()) {
      setEditingField(null);
      setEmailError(null);
      return true;
    }

    setIsRequestingEmailChange(true);
    setEmailError(null);
    try {
      const response = await requestEmailChange(token, {
        email: normalizedEmail,
      });
      updateSession(response);
      setEditingField(null);
      setEmailDraft(response.user.pendingEmail ?? response.user.email ?? "");
      setSavedEmail(response.user.email ?? "");
      toast.success("Verification link sent to your new email.");
      return true;
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to request email verification.",
      );
      setEmailError(message);
      notifyApiError(err, "Failed to request email verification.");
      return false;
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handleTimezoneChange = async (nextTimezone: string): Promise<void> => {
    const previousTimezone = timezone;
    setTimezone(nextTimezone);
    setIsSavingTimezone(true);
    try {
      const response = await updateCurrentUserProfile(token, {
        timezone: nextTimezone || null,
      });
      updateSession(response);
    } catch (err) {
      setTimezone(previousTimezone);
      notifyApiError(err, "Failed to update time zone.");
    } finally {
      setIsSavingTimezone(false);
    }
  };

  const handleChangePassword = (): void => {
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordDialogOpen(true);
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

    setIsPasswordSubmitting(true);
    try {
      await changePassword(token, {
        currentPassword,
        newPassword,
      });
      toast.success("Password updated.");
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to update password.");
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

  const handleLogOut = async (): Promise<void> => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = (): void => {
    setIsDeleteDialogOpen(true);
  };

  const accountDisplayName = [firstName.trim(), lastName.trim()]
    .filter((part) => part.length > 0)
    .join(" ");
  const accountNameForDialog =
    accountDisplayName.length > 0
      ? accountDisplayName
      : (user?.name ?? "this account");

  const handleDeleteAccountConfirm = async (): Promise<void> => {
    try {
      await deleteCurrentUser(token);
      await logout();
    } catch (err) {
      notifyApiError(err, "Failed to delete account.");
    }
  };

  return (
    <DashboardPage.Root>
      <DashboardPage.Header title="Settings" />

      <DashboardPage.Body>
        <DashboardPage.Content key={user?.id ?? "anonymous"}>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
              <motion.section
                aria-labelledby="account-information-heading"
                className="border-b border-border pb-8"
                {...sectionMotionProps}
              >
                <header className="mb-4">
                  <h2
                    id="account-information-heading"
                    className="text-base font-semibold tracking-tight"
                  >
                    Account Information
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Profile and sign-in details.
                  </p>
                </header>

                <dl className="space-y-4">
                  <SettingsField label="Profile picture">
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={handleChangeProfilePicture}
                        disabled={isAvatarUploading}
                        className="group relative size-14 overflow-hidden rounded-full border border-border bg-muted p-0 hover:bg-muted/70"
                        aria-label="Change profile picture"
                        aria-busy={isAvatarUploading}
                      >
                        {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="Profile picture"
                            width={56}
                            height={56}
                            className="size-14 object-cover"
                            unoptimized
                            onError={() => setFailedAvatarUrl(avatarUrl)}
                          />
                        ) : (
                          <IconUser className="size-6 text-muted-foreground" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
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
                    {profilePictureError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {profilePictureError}
                      </p>
                    ) : null}
                  </SettingsField>

                  <SettingsField label="First name">
                    <div className={controlContainerClass}>
                      {editingField === "firstName" ? (
                        <div className="flex items-start gap-2">
                          <Input
                            ref={firstNameInputRef}
                            id="firstName"
                            value={firstName}
                            onChange={(event) =>
                              setFirstName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void (async () => {
                                  const didSave = await saveProfileName(
                                    firstName,
                                    lastName,
                                  );
                                  if (didSave) {
                                    setEditingField(null);
                                  }
                                })();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setFirstName(savedFirstName);
                                setProfileNameError(null);
                                setEditingField(null);
                              }
                            }}
                            aria-label="First name"
                            className={`${controlClass} flex-1`}
                          />
                          <DirtyFieldActions
                            canConfirm={isFirstNameDirty}
                            confirmLabel="Save first name"
                            cancelLabel="Cancel first name changes"
                            isSubmitting={isSavingProfileName}
                            onConfirm={() => {
                              void (async () => {
                                const didSave = await saveProfileName(
                                  firstName,
                                  lastName,
                                );
                                if (didSave) {
                                  setEditingField(null);
                                }
                              })();
                            }}
                            onCancel={() => {
                              setFirstName(savedFirstName);
                              setProfileNameError(null);
                              setEditingField(null);
                            }}
                          />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setProfileNameError(null);
                            setEditingField("firstName");
                          }}
                          disabled={isSavingProfileName}
                          className={`${controlClass} justify-between gap-2 pr-2`}
                          aria-label="Edit first name"
                        >
                          <span>{firstName || "Set first name"}</span>
                          <IconPencil
                            className="size-3.5 text-muted-foreground/80"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                    </div>
                    {editingField === "firstName" && profileNameError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {profileNameError}
                      </p>
                    ) : null}
                  </SettingsField>

                  <SettingsField label="Last name">
                    <div className={controlContainerClass}>
                      {editingField === "lastName" ? (
                        <div className="flex items-start gap-2">
                          <Input
                            ref={lastNameInputRef}
                            id="lastName"
                            value={lastName}
                            onChange={(event) =>
                              setLastName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void (async () => {
                                  const didSave = await saveProfileName(
                                    firstName,
                                    lastName,
                                  );
                                  if (didSave) {
                                    setEditingField(null);
                                  }
                                })();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setLastName(savedLastName);
                                setProfileNameError(null);
                                setEditingField(null);
                              }
                            }}
                            aria-label="Last name"
                            className={`${controlClass} flex-1`}
                          />
                          <DirtyFieldActions
                            canConfirm={isLastNameDirty}
                            confirmLabel="Save last name"
                            cancelLabel="Cancel last name changes"
                            isSubmitting={isSavingProfileName}
                            onConfirm={() => {
                              void (async () => {
                                const didSave = await saveProfileName(
                                  firstName,
                                  lastName,
                                );
                                if (didSave) {
                                  setEditingField(null);
                                }
                              })();
                            }}
                            onCancel={() => {
                              setLastName(savedLastName);
                              setProfileNameError(null);
                              setEditingField(null);
                            }}
                          />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setProfileNameError(null);
                            setEditingField("lastName");
                          }}
                          disabled={isSavingProfileName}
                          className={`${controlClass} justify-between gap-2 pr-2`}
                          aria-label="Edit last name"
                        >
                          <span>{lastName || "Set last name"}</span>
                          <IconPencil
                            className="size-3.5 text-muted-foreground/80"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                    </div>
                    {editingField === "lastName" && profileNameError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {profileNameError}
                      </p>
                    ) : null}
                  </SettingsField>

                  <SettingsField label="Username">
                    <div className={controlContainerClass}>
                      <Input
                        disabled
                        value={user?.username ?? "-"}
                        className={`${controlClass} disabled:border-border disabled:bg-muted/60 disabled:text-foreground/80 disabled:opacity-100`}
                      />
                    </div>
                  </SettingsField>

                  <SettingsField label="Email">
                    <div className={controlContainerClass}>
                      {editingField === "email" ? (
                        <div className="flex items-start gap-2">
                          <Input
                            ref={emailInputRef}
                            id="email"
                            type="email"
                            value={emailDraft}
                            onChange={(event) =>
                              setEmailDraft(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void (async () => {
                                  const didRequest =
                                    await requestEmailVerification();
                                  if (didRequest) {
                                    setEditingField(null);
                                  }
                                })();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setEmailDraft(displayedEmail);
                                setEmailError(null);
                                setEditingField(null);
                              }
                            }}
                            aria-label="Email"
                            className={`${controlClass} flex-1`}
                          />
                          <DirtyFieldActions
                            canConfirm={isEmailDirty}
                            confirmLabel="Request email verification"
                            cancelLabel="Cancel email changes"
                            isSubmitting={isRequestingEmailChange}
                            onConfirm={() => {
                              void (async () => {
                                const didRequest =
                                  await requestEmailVerification();
                                if (didRequest) {
                                  setEditingField(null);
                                }
                              })();
                            }}
                            onCancel={() => {
                              setEmailDraft(displayedEmail);
                              setEmailError(null);
                              setEditingField(null);
                            }}
                          />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className={`${controlClass} justify-between gap-2 pr-2`}
                          onClick={() => {
                            setEmailError(null);
                            setEmailDraft(displayedEmail);
                            setEditingField("email");
                          }}
                          aria-label="Edit email"
                        >
                          <span>{displayedEmail || "Set email address"}</span>
                          <IconPencil
                            className="size-3.5 text-muted-foreground/80"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                    </div>
                    {pendingEmail ? (
                      <p className="text-xs text-primary" aria-live="polite">
                        Pending verification: {pendingEmail}
                      </p>
                    ) : null}
                    {emailError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {emailError}
                      </p>
                    ) : null}
                  </SettingsField>

                  <SettingsField label="Password">
                    <div className={controlContainerClass}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleChangePassword}
                        className={controlClass}
                      >
                        Change Password
                      </Button>
                    </div>
                  </SettingsField>
                </dl>
              </motion.section>

              <motion.section
                aria-labelledby="system-settings-heading"
                className="border-b border-border pb-8"
                {...sectionMotionProps}
              >
                <header className="mb-4">
                  <h2
                    id="system-settings-heading"
                    className="text-base font-semibold tracking-tight"
                  >
                    System Settings
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Display and region preferences.
                  </p>
                </header>

                <dl className="space-y-4">
                  <SettingsField label="Time zone">
                    <div className={controlContainerClass}>
                      <Select
                        value={timezone}
                        onValueChange={handleTimezoneChange}
                      >
                        <SelectTrigger
                          className={controlClass}
                          disabled={isSavingTimezone}
                          aria-label="Select time zone"
                        >
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent
                          className="max-h-56"
                          position="popper"
                          align="start"
                          sideOffset={6}
                        >
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </SettingsField>

                  <SettingsField label="Theme">
                    <div className={controlContainerClass}>
                      <Select
                        value={theme ?? "light"}
                        onValueChange={(nextTheme) => setTheme(nextTheme)}
                      >
                        <SelectTrigger
                          className={controlClass}
                          aria-label="Select theme"
                        >
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="start"
                          sideOffset={6}
                        >
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </SettingsField>
                </dl>
              </motion.section>

              <motion.section
                aria-labelledby="danger-zone-heading"
                className="space-y-4"
                {...sectionMotionProps}
              >
                <header>
                  <h2
                    id="danger-zone-heading"
                    className="text-base font-semibold tracking-tight text-destructive"
                  >
                    Danger Zone
                  </h2>
                  <p className="mt-1 text-sm text-destructive/80">
                    Warning: these actions can impact your access immediately.
                  </p>
                </header>
                <div className="rounded-md border border-destructive/35 bg-destructive/5">
                  <div className="divide-y divide-destructive/20">
                    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                      <div className="max-w-2xl">
                        <p className="text-sm font-semibold">
                          Log out this session
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ends your current session on this device.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleLogOut}
                        disabled={isLoggingOut}
                        aria-busy={isLoggingOut}
                      >
                        {isLoggingOut ? "Logging out..." : "Log Out"}
                      </Button>
                    </div>

                    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                      <div className="max-w-2xl">
                        <p className="text-sm font-semibold">
                          Delete this account
                        </p>
                        <p className="text-sm text-destructive/80">
                          Permanently removes your account and cannot be undone.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        className="h-10 w-full sm:w-auto"
                        disabled={isLoggingOut}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </DashboardPage.Content>
      </DashboardPage.Body>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) {
            setPasswordError(null);
            setIsPasswordSubmitting(false);
          }
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
                  className={controlClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={controlClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
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
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={isPasswordSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmitPassword}>
                {isPasswordSubmitting ? "Updating..." : "Update Password"}
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
        errorFallback="Failed to delete account."
        onConfirm={handleDeleteAccountConfirm}
      />
    </DashboardPage.Root>
  );
}
