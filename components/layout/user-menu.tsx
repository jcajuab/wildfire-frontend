"use client";

import Image from "next/image";
import { IconLogout, IconSettings, IconUser } from "@tabler/icons-react";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import { useAuth } from "@/context/auth-context";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";

interface UserMenuAvatarProps {
  readonly size: number;
  readonly avatarUrl: string | null;
  readonly displayName: string;
  readonly fallbackIconClassName: string;
  readonly wrapperClassName: string;
  readonly onAvatarError: () => void;
}

function UserMenuAvatar({
  size,
  avatarUrl,
  displayName,
  fallbackIconClassName,
  wrapperClassName,
  onAvatarError,
}: UserMenuAvatarProps): ReactElement {
  if (avatarUrl) {
    return (
      <div className={wrapperClassName}>
        <Image
          key={avatarUrl}
          src={avatarUrl}
          alt={`${displayName} avatar`}
          width={size * 2}
          height={size * 2}
          className="size-full rounded-full object-cover"
          onError={onAvatarError}
        />
      </div>
    );
  }
  return (
    <div className={wrapperClassName}>
      <IconUser className={fallbackIconClassName} />
    </div>
  );
}

interface UserMenuProps {
  readonly trigger: (args: { avatar: ReactNode }) => ReactNode;
  readonly menuSide?: "top" | "bottom";
  readonly menuAlign?: "center" | "end";
  readonly avatarSize: number;
  readonly avatarWrapperClassName: string;
  readonly fallbackIconClassName: string;
}

export function UserMenu({
  trigger,
  menuSide = "top",
  menuAlign = "center",
  avatarSize,
  avatarWrapperClassName,
  fallbackIconClassName,
}: UserMenuProps): ReactElement {
  const { user, isInitialized } = useAuth();
  const { pending, logout } = useLogout();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const displayName = user?.name ?? "User";
  const canAccessSettings = isInitialized;
  const avatarUrl =
    user?.avatarUrl && failedAvatarUrl !== user.avatarUrl
      ? user.avatarUrl
      : null;

  const avatar = (
    <UserMenuAvatar
      size={avatarSize}
      avatarUrl={avatarUrl}
      displayName={displayName}
      wrapperClassName={cn(
        "flex items-center justify-center rounded-full bg-sidebar-foreground/15",
        avatarWrapperClassName,
      )}
      fallbackIconClassName={fallbackIconClassName}
      onAvatarError={() => setFailedAvatarUrl(user?.avatarUrl ?? null)}
    />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger({ avatar })}</DropdownMenuTrigger>
      <DropdownMenuContent side={menuSide} align={menuAlign} sideOffset={8}>
        {canAccessSettings ? (
          <DropdownMenuItem asChild>
            <AdminNavLink href="/admin/settings">
              <IconSettings className="size-4" />
              Settings
            </AdminNavLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            void logout();
          }}
        >
          <IconLogout className="size-4" />
          {pending ? "Logging out…" : "Log Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
