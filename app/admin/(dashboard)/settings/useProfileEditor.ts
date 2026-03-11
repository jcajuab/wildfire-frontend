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
  readonly token: string | null;
  readonly updateSession: (response: AuthResponse) => void;
}

export function useProfileEditor({
  userName,
  token,
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

  const saveProfileName = useCallback(
    async (nextFirstName: string, nextLastName: string): Promise<boolean> => {
      if (!token) {
        setProfileNameError("Not authenticated.");
        return false;
      }

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
        setProfileNameError(
          getApiErrorMessage(err, "Failed to update profile."),
        );
        notifyApiError(err, "Failed to update profile.");
        return false;
      } finally {
        setIsSavingProfileName(false);
      }
    },
    [token, savedFirstName, savedLastName, updateSession],
  );

  const handleAvatarUpload = useCallback(
    async (file: File): Promise<void> => {
      if (!token) {
        setProfilePictureError("Not authenticated.");
        return;
      }

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
    },
    [token, updateSession],
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
    setFirstName,
    setLastName,
    setProfileNameError,
    setEditingField,
    setProfilePictureError,
    saveProfileName,
    handleAvatarUpload,
  };
}
