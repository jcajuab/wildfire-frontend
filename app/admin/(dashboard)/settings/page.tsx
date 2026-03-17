"use client";

import type { ReactElement } from "react";
import { motion } from "framer-motion";

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
import { ProfileNameEditor } from "./_components/profile-name-editor";
import { SettingsField } from "./_components/settings-field";
import { useSettingsPage } from "./_hooks/use-settings-page";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

export default function SettingsPage(): ReactElement {
  const {
    user,
    isInvitedUser,
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
                      {user?.email ? (
                        <Input
                          disabled
                          value={user.email}
                          className={`${controlClass} disabled:border-border disabled:bg-muted/60 disabled:text-foreground/80 disabled:opacity-100`}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Contact your administrator
                        </p>
                      )}
                    </div>
                  </SettingsField>

                  <SettingsField label="Password">
                    <div className={controlContainerClass}>
                      {isInvitedUser ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleChangePassword}
                          className={controlClass}
                        >
                          Change Password
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Managed by your organization
                        </p>
                      )}
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

                    {isInvitedUser && (
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

      {isInvitedUser && (
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
