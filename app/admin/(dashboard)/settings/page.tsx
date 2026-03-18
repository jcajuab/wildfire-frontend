"use client";

import type { ReactElement } from "react";
import { motion } from "framer-motion";
import { IconPencil } from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AICredentialsSection } from "./_components/ai-credentials-section";
import { AvatarUploader } from "./_components/avatar-uploader";
import { ChangePasswordDialog } from "./_components/change-password-dialog";
import { DirtyFieldActions } from "./_components/dirty-field-actions";
import { ProfileNameEditor } from "./_components/profile-name-editor";
import { SettingsField } from "./_components/settings-field";
import { useSettingsPage } from "./_hooks/use-settings-page";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

export default function SettingsPage(): ReactElement {
  const {
    user,
    isWildfireUser,
    theme,
    setTheme,
    sectionMotionProps,
    profileEditor,
    avatarUrl,
    accountNameForDialog,
    isPasswordDialogOpen,
    isDeleteDialogOpen,
    isLoggingOut,
    handleChangePassword,
    handlePasswordSubmit,
    handleLogOut,
    handleDeleteAccount,
    handleDeleteAccountConfirm,
    setIsPasswordDialogOpen,
    setIsDeleteDialogOpen,
  } = useSettingsPage();

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
                    <AvatarUploader
                      avatarUrl={avatarUrl}
                      isUploading={profileEditor.isAvatarUploading}
                      error={profileEditor.profilePictureError}
                      onUpload={profileEditor.handleAvatarUpload}
                      onClearError={() =>
                        profileEditor.setProfilePictureError(null)
                      }
                      onError={(message) =>
                        profileEditor.setProfilePictureError(message)
                      }
                    />
                  </SettingsField>

                  <ProfileNameEditor
                    firstName={profileEditor.firstName}
                    lastName={profileEditor.lastName}
                    savedFirstName={profileEditor.savedFirstName}
                    savedLastName={profileEditor.savedLastName}
                    editingField={profileEditor.editingField}
                    isSavingProfileName={profileEditor.isSavingProfileName}
                    profileNameError={profileEditor.profileNameError}
                    onFirstNameChange={profileEditor.setFirstName}
                    onLastNameChange={profileEditor.setLastName}
                    onEditFieldChange={(field) => {
                      if (field) {
                        profileEditor.setProfileNameError(null);
                      }
                      profileEditor.setEditingField(field);
                    }}
                    onSaveProfileName={profileEditor.saveProfileName}
                    onCancelEdit={() => {
                      profileEditor.setFirstName(profileEditor.savedFirstName);
                      profileEditor.setLastName(profileEditor.savedLastName);
                      profileEditor.setProfileNameError(null);
                      profileEditor.setEditingField(null);
                    }}
                  />

                  {isWildfireUser && (
                    <SettingsField label="Username">
                      <div className={controlContainerClass}>
                        {profileEditor.isEditingUsername ? (
                          <div className="flex items-start gap-2">
                            <Input
                              id="username"
                              value={profileEditor.username}
                              onChange={(event) =>
                                profileEditor.setUsername(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void (async () => {
                                    const didSave =
                                      await profileEditor.saveUsername(
                                        profileEditor.username,
                                      );
                                    if (didSave) {
                                      profileEditor.setIsEditingUsername(false);
                                    }
                                  })();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  profileEditor.setUsername(
                                    profileEditor.savedUsername,
                                  );
                                  profileEditor.setUsernameError(null);
                                  profileEditor.setIsEditingUsername(false);
                                }
                              }}
                              aria-label="Username"
                              className={`${controlClass} flex-1`}
                            />
                            <DirtyFieldActions
                              canConfirm={
                                profileEditor.username.trim() !==
                                profileEditor.savedUsername.trim()
                              }
                              confirmLabel="Save username"
                              cancelLabel="Cancel username changes"
                              isSubmitting={profileEditor.isSavingUsername}
                              onConfirm={() => {
                                void (async () => {
                                  const didSave =
                                    await profileEditor.saveUsername(
                                      profileEditor.username,
                                    );
                                  if (didSave) {
                                    profileEditor.setIsEditingUsername(false);
                                  }
                                })();
                              }}
                              onCancel={() => {
                                profileEditor.setUsername(
                                  profileEditor.savedUsername,
                                );
                                profileEditor.setUsernameError(null);
                                profileEditor.setIsEditingUsername(false);
                              }}
                            />
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              profileEditor.setUsernameError(null);
                              profileEditor.setIsEditingUsername(true);
                            }}
                            disabled={profileEditor.isSavingUsername}
                            className={`${controlClass} justify-between gap-2 pr-2`}
                            aria-label="Edit username"
                          >
                            <span>
                              {profileEditor.savedUsername || "Set username"}
                            </span>
                            <IconPencil
                              className="size-3.5 text-muted-foreground/80"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </div>
                      {profileEditor.isEditingUsername &&
                      profileEditor.usernameError ? (
                        <p role="alert" className="text-xs text-destructive">
                          {profileEditor.usernameError}
                        </p>
                      ) : null}
                    </SettingsField>
                  )}

                  {isWildfireUser && (
                    <SettingsField label="Email">
                      <div className={controlContainerClass}>
                        {profileEditor.isEditingEmail ? (
                          <div className="flex items-start gap-2">
                            <Input
                              id="email"
                              type="email"
                              value={profileEditor.email}
                              onChange={(event) =>
                                profileEditor.setEmail(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void (async () => {
                                    const didSave =
                                      await profileEditor.saveEmail(
                                        profileEditor.email,
                                      );
                                    if (didSave) {
                                      profileEditor.setIsEditingEmail(false);
                                    }
                                  })();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  profileEditor.setEmail(
                                    profileEditor.savedEmail ?? "",
                                  );
                                  profileEditor.setEmailError(null);
                                  profileEditor.setIsEditingEmail(false);
                                }
                              }}
                              aria-label="Email"
                              className={`${controlClass} flex-1`}
                            />
                            <DirtyFieldActions
                              canConfirm={
                                profileEditor.email.trim() !==
                                (profileEditor.savedEmail ?? "").trim()
                              }
                              confirmLabel="Save email"
                              cancelLabel="Cancel email changes"
                              isSubmitting={profileEditor.isSavingEmail}
                              onConfirm={() => {
                                void (async () => {
                                  const didSave = await profileEditor.saveEmail(
                                    profileEditor.email,
                                  );
                                  if (didSave) {
                                    profileEditor.setIsEditingEmail(false);
                                  }
                                })();
                              }}
                              onCancel={() => {
                                profileEditor.setEmail(
                                  profileEditor.savedEmail ?? "",
                                );
                                profileEditor.setEmailError(null);
                                profileEditor.setIsEditingEmail(false);
                              }}
                            />
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              profileEditor.setEmailError(null);
                              profileEditor.setIsEditingEmail(true);
                            }}
                            disabled={profileEditor.isSavingEmail}
                            className={`${controlClass} justify-between gap-2 pr-2`}
                            aria-label="Edit email"
                          >
                            <span>
                              {profileEditor.savedEmail || "Set email"}
                            </span>
                            <IconPencil
                              className="size-3.5 text-muted-foreground/80"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </div>
                      {profileEditor.isEditingEmail &&
                      profileEditor.emailError ? (
                        <p role="alert" className="text-xs text-destructive">
                          {profileEditor.emailError}
                        </p>
                      ) : null}
                    </SettingsField>
                  )}

                  {isWildfireUser && (
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
                  )}
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
                    Display preferences.
                  </p>
                </header>

                <dl className="space-y-4">
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

              <AICredentialsSection sectionMotionProps={sectionMotionProps} />

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

                    {isWildfireUser && (
                      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                        <div className="max-w-2xl">
                          <p className="text-sm font-semibold">
                            Delete this account
                          </p>
                          <p className="text-sm text-destructive/80">
                            Permanently removes your account and cannot be
                            undone.
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
                    )}
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </DashboardPage.Content>
      </DashboardPage.Body>

      {isWildfireUser && (
        <ChangePasswordDialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          onSubmit={handlePasswordSubmit}
        />
      )}

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
