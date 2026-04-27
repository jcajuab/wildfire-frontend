"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendarEvent,
  IconDeviceTv,
  IconDotsVertical,
  IconPhoto,
  IconList,
  IconPlaylist,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType, ReactElement } from "react";
import { useMemo } from "react";

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
import { GlobalEmergencyButton } from "@/components/layout/global-emergency-button";
import { UserMenu } from "@/components/layout/user-menu";
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
  const { user, can, isInitialized } = useAuth();
  const { isMobile } = useSidebar();

  const coreNavItems = useMemo(
    () =>
      resolveNavItems(
        getRoutesBySection("core"),
        isInitialized ? can : () => true,
      ),
    [can, isInitialized],
  );

  const manageNavItems = useMemo(
    () =>
      resolveNavItems(
        getRoutesBySection("manage"),
        isInitialized ? can : () => true,
      ),
    [can, isInitialized],
  );

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
        <Link href={homeRoute} aria-label="Home" prefetch>
          <WildfireLogo className="h-6" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main navigation">
          {coreNavItems.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-sidebar-foreground">
                {CORE_SECTION}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {coreNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        isActive={isActiveRoute(pathname, item.href, item.match)}
                        className="text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-sidebar-foreground data-[active=true]:hover:text-primary [&_svg]:text-sidebar-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
                        tooltip={item.title}
                      >
                        <Link href={item.href} prefetch>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {manageNavItems.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-sidebar-foreground">
                {MANAGE_SECTION}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {manageNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        isActive={isActiveRoute(pathname, item.href, item.match)}
                        className="text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-sidebar-foreground data-[active=true]:hover:text-primary [&_svg]:text-sidebar-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
                        tooltip={item.title}
                      >
                        <Link href={item.href} prefetch>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </nav>

        {!isMobile ? <GlobalEmergencyButton variant="sidebar" /> : null}
      </SidebarContent>

      {!isMobile ? (
        <SidebarFooter>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <UserMenu
                menuSide="top"
                menuAlign="center"
                avatarSize={28}
                avatarWrapperClassName="size-7"
                fallbackIconClassName="size-6 text-sidebar-foreground"
                trigger={({ avatar }) => (
                  <SidebarMenuButton
                    size="lg"
                    className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-2">
                      {avatar}
                      <div className="flex min-w-0 flex-col items-start">
                        <span className="truncate text-sm font-medium leading-5">
                          {displayName}
                        </span>
                        <span className="truncate text-xs leading-5 text-sidebar-foreground">
                          {displayEmail}
                        </span>
                      </div>
                    </div>
                    <IconDotsVertical className="size-4 text-sidebar-foreground" />
                  </SidebarMenuButton>
                )}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
