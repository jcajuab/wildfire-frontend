"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendarEvent,
  IconDeviceDesktop,
  IconDotsVertical,
  IconList,
  IconPhoto,
  IconPlaylist,
  IconLogout,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import Image from "next/image";
import type { CSSProperties, ComponentType, ReactElement } from "react";
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
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { useAuth } from "@/context/auth-context";
import {
  getRoutesBySection,
  isPathMatch,
  type DashboardRouteReadPermissionEntry,
} from "@/lib/route-permissions";
import type { PermissionType } from "@/types/permission";

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly permission: PermissionType;
  readonly match: DashboardRouteReadPermissionEntry["match"];
}

const CORE_SECTION = "CORE";
const MANAGE_SECTION = "MANAGE";

type SidebarStyleVariables = CSSProperties & {
  [key: `--${string}`]: string;
};

const NAV_ICON_BY_PATH: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "/admin/displays": IconDeviceDesktop,
  "/admin/content": IconPhoto,
  "/admin/playlists": IconPlaylist,
  "/admin/schedules": IconCalendarEvent,
  "/admin/users": IconUsers,
  "/admin/roles": IconShield,
  "/admin/logs": IconList,
  "/admin/settings": IconSettings,
};

function resolveNavItems(
  entries: readonly DashboardRouteReadPermissionEntry[],
  can: (permission: PermissionType) => boolean,
): readonly NavItem[] {
  return entries
    .filter((entry) => can(entry.permission))
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

function isReadyNavigationSectionVisible(
  items: readonly NavItem[],
): items is readonly NavItem[] {
  return items.length > 0;
}

export function AppSidebar(): ReactElement {
  const pathname = usePathname();
  const { user, logout, can, isInitialized } = useAuth();
  const mounted = useMounted();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

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

  const canAccessSettings = isInitialized && can("settings:read");
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";

  const sidebarColors: SidebarStyleVariables = {
    "--sidebar": "var(--primary)",
    "--sidebar-foreground": "var(--primary-foreground)",
    "--sidebar-primary": "var(--primary-foreground)",
    "--sidebar-primary-foreground": "var(--primary)",
    "--sidebar-accent":
      "color-mix(in oklab, var(--primary-foreground) 14%, var(--primary))",
    "--sidebar-accent-foreground": "var(--primary-foreground)",
    "--sidebar-border":
      "color-mix(in oklab, var(--primary-foreground) 20%, var(--primary))",
    "--sidebar-ring": "var(--primary-foreground)",
  };

  return (
    <Sidebar
      variant="floating"
      collapsible="offcanvas"
      className="pr-0"
      style={sidebarColors}
    >
      <SidebarHeader className="flex flex-row items-center justify-between">
        <Link
          href="/admin/displays"
          className="flex items-center gap-2 px-2 font-semibold text-primary-foreground"
        >
          <span className="text-xl tracking-tight">WILDFIRE</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-primary-foreground/70">
            {CORE_SECTION}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {isReadyNavigationSectionVisible(coreNavItems) &&
                coreNavItems.map((item) => {
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
                        className="text-primary-foreground hover:bg-primary-foreground/14 hover:text-primary-foreground data-[active=true]:bg-primary-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-primary-foreground data-[active=true]:hover:text-primary [&_svg]:text-primary-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-primary-foreground/70">
            {MANAGE_SECTION}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {isReadyNavigationSectionVisible(manageNavItems) &&
                manageNavItems.map((item) => {
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
                        className="text-primary-foreground hover:bg-primary-foreground/14 hover:text-primary-foreground data-[active=true]:bg-primary-foreground data-[active=true]:text-primary data-[active=true]:hover:bg-primary-foreground data-[active=true]:hover:text-primary [&_svg]:text-primary-foreground data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary"
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full justify-between text-primary-foreground hover:bg-primary-foreground/14 hover:text-primary-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary-foreground/15">
                      {user?.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt="User Avatar"
                          width={48}
                          height={48}
                          className="size-7 rounded-full object-cover"
                          unoptimized
                          onError={() =>
                            setFailedAvatarUrl(user?.avatarUrl ?? null)
                          }
                        />
                      ) : (
                        <IconUser className="size-6 text-primary-foreground/80" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-sm font-medium leading-5">
                        {displayName}
                      </span>
                      <span className="truncate text-sm leading-5 text-primary-foreground/85">
                        {displayEmail}
                      </span>
                    </div>
                  </div>
                  <IconDotsVertical className="size-4 text-primary-foreground/90" />
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
    </Sidebar>
  );
}
