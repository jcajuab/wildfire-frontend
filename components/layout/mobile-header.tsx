"use client";

import Link from "next/link";
import { IconMenu2 } from "@tabler/icons-react";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { WildfireLogo } from "@/components/common/wildfire-logo";
import { GlobalEmergencyButton } from "@/components/layout/global-emergency-button";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/context/auth-context";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";

export function MobileHeader(): ReactElement {
  const { toggleSidebar } = useSidebar();
  const { can, isInitialized } = useAuth();

  const homeRoute = useMemo(
    () =>
      isInitialized
        ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
        : UNAUTHORIZED_ROUTE,
    [can, isInitialized],
  );

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
        prefetch
        className="flex items-center text-sidebar-foreground"
      >
        <WildfireLogo className="h-5" />
      </Link>

      <div className="flex-1" />

      <GlobalEmergencyButton variant="compact" />

      <UserMenu
        menuSide="bottom"
        menuAlign="end"
        avatarSize={28}
        avatarWrapperClassName="size-7"
        fallbackIconClassName="size-4 text-sidebar-foreground"
        trigger={({ avatar }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {avatar}
          </Button>
        )}
      />
    </header>
  );
}
