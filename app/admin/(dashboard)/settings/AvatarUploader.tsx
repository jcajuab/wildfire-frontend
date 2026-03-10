import type { ChangeEvent, ReactElement } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { IconPencil, IconUser } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface AvatarUploaderProps {
  readonly avatarUrl: string | null;
  readonly isUploading: boolean;
  readonly error: string | null;
  readonly onUpload: (file: File) => Promise<void>;
  readonly onClearError: () => void;
  readonly onError?: (message: string) => void;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function AvatarUploader({
  avatarUrl,
  isUploading,
  error,
  onUpload,
  onClearError,
  onError,
}: AvatarUploaderProps): ReactElement {
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const handleChangeProfilePicture = (): void => {
    onClearError();
    profilePictureInputRef.current?.click();
  };

  const handleProfilePictureSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    onClearError();
    event.target.value = "";
    if (!file) return;

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      onError?.(
        `File size must be ${MAX_AVATAR_SIZE_BYTES / (1024 * 1024)} MB or smaller.`,
      );
      return;
    }

    await onUpload(file);
  };

  return (
    <>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={handleChangeProfilePicture}
          disabled={isUploading}
          className="group relative size-14 overflow-hidden rounded-full border border-border bg-muted p-0 hover:bg-muted/70"
          aria-label="Change profile picture"
          aria-busy={isUploading}
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
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
