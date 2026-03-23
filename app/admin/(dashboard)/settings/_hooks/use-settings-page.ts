"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { changePassword, deleteCurrentUser } from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useProfileEditor } from "./use-profile-editor";

export interface UseSettingsPageResult {
  // Auth
  user: ReturnType<typeof useAuth>["user"];
  logout: ReturnType<typeof useAuth>["logout"];
  isInvitedUser: boolean;
  isWildfireUser: boolean;

  // Theme
  theme: string | undefined;
  setTheme: (theme: string) => void;

  // Motion
  prefersReducedMotion: boolean | null;

  // Profile editor
  profileEditor: ReturnType<typeof useProfileEditor>;

  // Derived
  avatarUrl: string | null;
  accountNameForDialog: string;

  // Dialog state
  isPasswordDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isLoggingOut: boolean;

  // Handlers
  handleChangePassword: () => void;
  handlePasswordSubmit: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  handleLogOut: () => Promise<void>;
  handleDeleteAccount: () => void;
  handleDeleteAccountConfirm: () => Promise<void>;

  // Setters
  setIsPasswordDialogOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
}

export function useSettingsPage(): UseSettingsPageResult {
  const { user, logout, updateSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<
    boolean | null
  >(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const profileEditor = useProfileEditor({
    userName: user?.name,
    userUsername: user?.username,
    userEmail: user?.email,
    updateSession,
  });

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const avatarUrl = user?.avatarUrl ?? null;
  const isInvitedUser = user?.isInvitedUser ?? false;
  const isWildfireUser = isInvitedUser || (user?.isAdmin ?? false);

  const accountDisplayName = [
    profileEditor.firstName.trim(),
    profileEditor.lastName.trim(),
  ]
    .filter((part) => part.length > 0)
    .join(" ");
  const accountNameForDialog =
    accountDisplayName.length > 0
      ? accountDisplayName
      : (user?.name ?? "this account");

  const handleChangePassword = (): void => {
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await changePassword(data);
    toast.success("Password updated.");
    setIsPasswordDialogOpen(false);
  };

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

  const handleDeleteAccountConfirm = async (): Promise<void> => {
    try {
      await deleteCurrentUser();
      await logout();
    } catch (err) {
      notifyApiError(err, "Failed to delete account.");
    }
  };

  return {
    user,
    logout,
    isInvitedUser,
    isWildfireUser,
    theme,
    setTheme,
    prefersReducedMotion: prefersReducedMotion ?? null,
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
  };
}
