"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { changePassword, deleteCurrentUser } from "@/lib/api-client";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useProfileEditor } from "./use-profile-editor";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot(): boolean | null {
  return null;
}

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

  // Handlers
  handleChangePassword: () => void;
  handlePasswordSubmit: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  handleDeleteAccount: () => void;
  handleDeleteAccountConfirm: () => Promise<void>;

  // Setters
  setIsPasswordDialogOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
}

export function useSettingsPage(): UseSettingsPageResult {
  const { user, logout, updateSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const prefersReducedMotion = useSyncExternalStore<boolean | null>(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const profileEditor = useProfileEditor({
    userName: user?.name,
    userUsername: user?.username,
    userEmail: user?.email,
    updateSession,
    logout,
  });

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const avatarUrl = user?.avatarUrl ?? null;
  const isInvitedUser = user?.isInvitedUser ?? false;
  const isWildfireUser = isInvitedUser || (user?.isAdmin ?? false);

  const accountDisplayName = profileEditor.name.trim();
  const accountNameForDialog =
    accountDisplayName.length > 0
      ? accountDisplayName
      : (user?.name ?? "this account");

  const handleChangePassword = useCallback((): void => {
    setIsPasswordDialogOpen(true);
  }, []);

  const handlePasswordSubmit = useCallback(
    async (data: {
      currentPassword: string;
      newPassword: string;
    }): Promise<void> => {
      await changePassword(data);
      setIsPasswordDialogOpen(false);
      toast.success("Successfully updated password. Logging out…");
      setTimeout(() => void logout(), 1500);
    },
    [logout],
  );

  const handleDeleteAccount = useCallback((): void => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteAccountConfirm = useCallback(async (): Promise<void> => {
    try {
      await deleteCurrentUser();
      await logout();
    } catch (err) {
      notifyApiError(err, "Failed to delete account.");
    }
  }, [logout]);

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
    handleChangePassword,
    handlePasswordSubmit,
    handleDeleteAccount,
    handleDeleteAccountConfirm,
    setIsPasswordDialogOpen,
    setIsDeleteDialogOpen,
  };
}
