import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { updateCurrentUserProfile, uploadAvatar } from "@/lib/api-client";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import type { AuthResponse } from "@/types/auth";

const normalizeName = (fullName: string | undefined): string => {
  return (fullName ?? "").trim() || "Admin";
};

interface UseProfileEditorProps {
  readonly userName: string | undefined;
  readonly userUsername: string | undefined;
  readonly userEmail: string | null | undefined;
  readonly updateSession: (response: AuthResponse) => void;
  readonly logout: () => Promise<void>;
}

export function useProfileEditor({
  userName,
  userUsername,
  userEmail,
  updateSession,
  logout,
}: UseProfileEditorProps) {
  const initialName = normalizeName(userName);
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);

  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  const [profileNameError, setProfileNameError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(
    null,
  );

  const [username, setUsername] = useState(userUsername ?? "");
  const [savedUsername, setSavedUsername] = useState(userUsername ?? "");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [email, setEmail] = useState(userEmail ?? "");
  const [savedEmail, setSavedEmail] = useState(userEmail ?? "");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    const nextName = normalizeName(userName);
    setSavedName(nextName);
    if (!isEditingName) {
      setName(nextName);
    }
  }, [isEditingName, userName]);

  useEffect(() => {
    if (!isEditingUsername) {
      setUsername(userUsername ?? "");
    }
    setSavedUsername(userUsername ?? "");
  }, [isEditingUsername, userUsername]);

  useEffect(() => {
    if (!isEditingEmail) {
      setEmail(userEmail ?? "");
    }
    setSavedEmail(userEmail ?? "");
  }, [isEditingEmail, userEmail]);

  const saveProfileName = useCallback(
    async (nextName: string): Promise<boolean> => {
      const normalizedName = nextName.trim();
      const normalizedSavedName = savedName.trim();

      setName(normalizedName);

      if (normalizedName.length === 0) {
        setProfileNameError("Name is required.");
        return false;
      }

      if (normalizedName === normalizedSavedName) {
        setProfileNameError(null);
        return true;
      }

      setIsSavingProfileName(true);
      setProfileNameError(null);
      try {
        const response = await updateCurrentUserProfile({
          name: normalizedName,
        });
        updateSession(response);
        setSavedName(normalizedName);
        toast.success("Successfully updated name");
        return true;
      } catch (err) {
        setProfileNameError(
          getApiErrorMessage(err, "Failed to update profile."),
        );
        notifyApiError(err, "Failed to update profile.");
        return false;
      } finally {
        setIsSavingProfileName(false);
      }
    },
    [savedName, updateSession],
  );

  const saveUsername = useCallback(
    async (nextUsername: string): Promise<boolean> => {
      const normalized = nextUsername.trim();
      setUsername(normalized);

      if (normalized === savedUsername.trim()) {
        setUsernameError(null);
        return true;
      }

      setIsSavingUsername(true);
      setUsernameError(null);
      try {
        await updateCurrentUserProfile({ username: normalized });
        setSavedUsername(normalized);
        toast.success("Successfully updated username. Logging out…");
        setTimeout(() => void logout(), 1500);
        return true;
      } catch (err) {
        setUsernameError(getApiErrorMessage(err, "Failed to update username."));
        notifyApiError(err, "Failed to update username.");
        return false;
      } finally {
        setIsSavingUsername(false);
      }
    },
    [savedUsername, logout],
  );

  const saveEmail = useCallback(
    async (nextEmail: string): Promise<boolean> => {
      const normalized = nextEmail.trim();
      setEmail(normalized);

      if (normalized === (savedEmail ?? "").trim()) {
        setEmailError(null);
        return true;
      }

      setIsSavingEmail(true);
      setEmailError(null);
      try {
        await updateCurrentUserProfile({ email: normalized || null });
        setSavedEmail(normalized);
        toast.success("Successfully updated email. Logging out…");
        setTimeout(() => void logout(), 1500);
        return true;
      } catch (err) {
        setEmailError(getApiErrorMessage(err, "Failed to update email."));
        notifyApiError(err, "Failed to update email.");
        return false;
      } finally {
        setIsSavingEmail(false);
      }
    },
    [savedEmail, logout],
  );

  const handleAvatarUpload = useCallback(
    async (file: File): Promise<void> => {
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
      const toastId = toast.loading("Uploading profile picture...");
      try {
        const response = await uploadAvatar(file);
        const newAvatarUrl = response.user?.avatarUrl;

        // Preload the image so the UI update is instant when we swap URLs.
        let preloadFailed = false;
        if (newAvatarUrl) {
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => {
              preloadFailed = true;
              resolve();
            };
            img.src = newAvatarUrl;
            setTimeout(resolve, 8000);
          });
        }

        updateSession(response);
        if (preloadFailed) {
          toast.warning(
            "Profile picture saved but could not be displayed. Try refreshing the page.",
            { id: toastId },
          );
        } else {
          toast.success("Profile picture updated.", { id: toastId });
        }
      } catch (err) {
        toast.dismiss(toastId);
        notifyApiError(err, "Failed to upload profile picture.");
      } finally {
        setIsAvatarUploading(false);
      }
    },
    [updateSession],
  );

  return {
    name,
    savedName,
    isSavingProfileName,
    profileNameError,
    isEditingName,
    isAvatarUploading,
    profilePictureError,
    username,
    savedUsername,
    isSavingUsername,
    usernameError,
    isEditingUsername,
    email,
    savedEmail,
    isSavingEmail,
    emailError,
    isEditingEmail,
    setName,
    setProfileNameError,
    setIsEditingName,
    setProfilePictureError,
    setUsername,
    setUsernameError,
    setIsEditingUsername,
    setEmail,
    setEmailError,
    setIsEditingEmail,
    saveProfileName,
    saveUsername,
    saveEmail,
    handleAvatarUpload,
  };
}
