import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { updateCurrentUserProfile, uploadAvatar } from "@/lib/api-client";
import {
  getApiErrorMessage,
  notifyApiError,
} from "@/lib/api/get-api-error-message";
import type { AuthResponse } from "@/types/auth";

const splitName = (
  fullName: string | undefined,
): { first: string; last: string } => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Admin";
  const last = parts.slice(1).join(" ");
  return { first, last };
};

interface UseProfileEditorProps {
  readonly userName: string | undefined;
  readonly userUsername: string | undefined;
  readonly userEmail: string | null | undefined;
  readonly updateSession: (response: AuthResponse) => void;
}

export function useProfileEditor({
  userName,
  userUsername,
  userEmail,
  updateSession,
}: UseProfileEditorProps) {
  const initialName = splitName(userName);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [savedFirstName, setSavedFirstName] = useState(initialName.first);
  const [savedLastName, setSavedLastName] = useState(initialName.last);

  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  const [profileNameError, setProfileNameError] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<
    "firstName" | "lastName" | null
  >(null);

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
    const nextName = splitName(userName);
    setSavedFirstName(nextName.first);
    setSavedLastName(nextName.last);
    if (editingField !== "firstName") {
      setFirstName(nextName.first);
    }
    if (editingField !== "lastName") {
      setLastName(nextName.last);
    }
  }, [editingField, userName]);

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
    async (nextFirstName: string, nextLastName: string): Promise<boolean> => {
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
        const response = await updateCurrentUserProfile({ name });
        updateSession(response);
        setSavedFirstName(normalizedFirstName);
        setSavedLastName(normalizedLastName);
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
    [savedFirstName, savedLastName, updateSession],
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
        const response = await updateCurrentUserProfile({
          username: normalized,
        });
        updateSession(response);
        setSavedUsername(normalized);
        return true;
      } catch (err) {
        setUsernameError(getApiErrorMessage(err, "Failed to update username."));
        notifyApiError(err, "Failed to update username.");
        return false;
      } finally {
        setIsSavingUsername(false);
      }
    },
    [savedUsername, updateSession],
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
        const response = await updateCurrentUserProfile({
          email: normalized || null,
        });
        updateSession(response);
        setSavedEmail(normalized);
        return true;
      } catch (err) {
        setEmailError(getApiErrorMessage(err, "Failed to update email."));
        notifyApiError(err, "Failed to update email.");
        return false;
      } finally {
        setIsSavingEmail(false);
      }
    },
    [savedEmail, updateSession],
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
      try {
        const response = await uploadAvatar(file);
        updateSession(response);
        toast.success("Profile picture updated.");
      } catch (err) {
        notifyApiError(err, "Failed to upload profile picture.");
      } finally {
        setIsAvatarUploading(false);
      }
    },
    [updateSession],
  );

  return {
    firstName,
    lastName,
    savedFirstName,
    savedLastName,
    isSavingProfileName,
    profileNameError,
    editingField,
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
    setFirstName,
    setLastName,
    setProfileNameError,
    setEditingField,
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
