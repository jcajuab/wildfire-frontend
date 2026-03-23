"use client";

import Link from "next/link";
import {
  IconLogout,
  IconMenu2,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { WildfireLogo } from "@/components/common/wildfire-logo";
import { GlobalEmergencyButton } from "@/components/layout/global-emergency-button";
import { useAuth } from "@/context/auth-context";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";

export function MobileHeader(): ReactElement {
  const { toggleSidebar } = useSidebar();
  const { user, logout, can, isInitialized } = useAuth();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const canAccessSettings = isInitialized;
  const homeRoute = useMemo(
    () =>
      isInitialized
        ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
        : UNAUTHORIZED_ROUTE,
    [can, isInitialized],
  );
  const displayName = user?.name ?? "User";

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <IconMenu2 className="size-5" />
      </Button>

      <Link
        href={homeRoute}
        aria-label="Home"
        className="flex items-center text-sidebar-foreground"
      >
        <WildfireLogo className="h-5" />
      </Link>

      <div className="flex-1" />

      <GlobalEmergencyButton variant="compact" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-foreground/15">
              {user?.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={`${displayName} avatar`}
                  width={28}
                  height={28}
                  className="size-7 rounded-full object-cover"
                  onError={() => setFailedAvatarUrl(user?.avatarUrl ?? null)}
                />
              ) : (
                <IconUser className="size-4 text-sidebar-foreground" />
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          {canAccessSettings ? (
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <IconSettings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              void logout();
            }}
          >
            <IconLogout className="size-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
