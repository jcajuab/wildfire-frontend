"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconDeviceTv,
  IconDotsVertical,
  IconPhoto,
  IconList,
  IconPlaylist,
  IconLogout,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import Image from "next/image";
import type { ComponentType, ReactElement } from "react";
import { useMemo, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { useGlobalEmergency } from "@/hooks/use-global-emergency";
import { useAuth } from "@/context/auth-context";
import {
  getRoutesBySection,
  isPathMatch,
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
  type DashboardRouteReadPermissionEntry,
} from "@/lib/route-permissions";
import type { PermissionType } from "@/types/permission";
import { WildfireLogo } from "@/components/common/wildfire-logo";

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly permission: PermissionType | undefined;
  readonly match: DashboardRouteReadPermissionEntry["match"];
}

const CORE_SECTION = "CORE";
const MANAGE_SECTION = "MANAGE";

const NAV_ICON_BY_PATH: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "/admin/displays": IconDeviceTv,
  "/admin/content": IconPhoto,
  "/admin/playlists": IconPlaylist,
  "/admin/schedules": IconCalendarEvent,
  "/admin/users": IconUsers,
  "/admin/roles": IconShield,
  "/admin/logs": IconList,
};

function resolveNavItems(
  entries: readonly DashboardRouteReadPermissionEntry[],
  can: (permission: PermissionType) => boolean,
): readonly NavItem[] {
  return entries
    .filter((entry) =>
      entry.permission == null ? true : can(entry.permission),
    )
    .map((entry) => ({
      title: entry.title,
      href: entry.path,
      permission: entry.permission,
      match: entry.match,
      icon: NAV_ICON_BY_PATH[entry.path],
    }))
    .filter((item): item is NavItem => item.icon !== undefined);
}

function isActiveRoute(
  pathname: string | null,
  href: string,
  match: "exact" | "prefix",
): boolean {
  if (!pathname) return false;
  return isPathMatch(pathname, href, match);
}

export function AppSidebar(): ReactElement {
  const pathname = usePathname();
  const { user, logout, can, isInitialized } = useAuth();
  const { isMobile } = useSidebar();
  const mounted = useMounted();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const {
    isActive: isEmergencyActive,
    isBusy: isEmergencyBusy,
    canRead: canReadEmergency,
    canUpdate: canUpdateEmergency,
    handleToggle: handleEmergencyToggle,
  } = useGlobalEmergency();

  const coreNavItems = useMemo(() => {
    return isInitialized
      ? resolveNavItems(getRoutesBySection("core"), can)
      : [];
  }, [can, isInitialized]);

  const manageNavItems = useMemo(() => {
    return isInitialized
      ? resolveNavItems(getRoutesBySection("manage"), can)
      : [];
  }, [can, isInitialized]);
  const canAccessSettings = isInitialized;
  const homeRoute = useMemo(
    () =>
      isInitialized
        ? (getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
        : UNAUTHORIZED_ROUTE,
    [can, isInitialized],
  );
  const displayName = user?.name ?? "User";
  const displayEmail =
    user?.email ?? (user?.username ? `@${user.username}` : "");

  return (
    <Sidebar variant="floating" collapsible="offcanvas" className="pr-0">
      <SidebarHeader>
        <Link href={homeRoute}>
          <WildfireLogo className="h-6" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {coreNavItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-sidebar-foreground/70">
              {CORE_SECTION}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {coreNavItems.map((item) => {
                  const isActive = isActiveRoute(
                    pathname,
                    item.href,
                    item.match,
                  );
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        isActive={isActive}
                        className="text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-sidebar-foreground data-[active=true]:hover:text-primary [&_svg]:text-sidebar-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
                        tooltip={mounted ? item.title : undefined}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {manageNavItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-sidebar-foreground/70">
              {MANAGE_SECTION}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {manageNavItems.map((item) => {
                  const isActive = isActiveRoute(
                    pathname,
                    item.href,
                    item.match,
                  );
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        isActive={isActive}
                        className="text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-sidebar-foreground data-[active=true]:hover:text-primary [&_svg]:text-sidebar-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
                        tooltip={mounted ? item.title : undefined}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {canReadEmergency && !isMobile ? (
          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="default"
                  onClick={handleEmergencyToggle}
                  disabled={!canUpdateEmergency || isEmergencyBusy}
                  className={
                    isEmergencyActive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground [&_svg]:text-destructive-foreground"
                      : "bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-destructive/80 hover:text-destructive-foreground [&_svg]:text-sidebar-foreground hover:[&_svg]:text-destructive-foreground"
                  }
                >
                  <IconAlertTriangle className="size-4" />
                  <span>
                    {isEmergencyBusy
                      ? "Updating..."
                      : isEmergencyActive
                        ? "Stop Emergency"
                        : "Start Emergency"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      {!isMobile ? (
        <SidebarFooter>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-foreground/15">
                        {user?.avatarUrl &&
                        failedAvatarUrl !== user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={`${displayName} avatar`}
                            width={48}
                            height={48}
                            className="size-7 rounded-full object-cover"
                            unoptimized
                            onError={() =>
                              setFailedAvatarUrl(user?.avatarUrl ?? null)
                            }
                          />
                        ) : (
                          <IconUser className="size-6 text-sidebar-foreground/80" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col items-start">
                        <span className="truncate text-sm font-medium leading-5">
                          {displayName}
                        </span>
                        <span className="truncate text-xs leading-5 text-sidebar-foreground/85">
                          {displayEmail}
                        </span>
                      </div>
                    </div>
                    <IconDotsVertical className="size-4 text-sidebar-foreground/90" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" sideOffset={8}>
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
