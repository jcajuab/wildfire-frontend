"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDeviceDesktop,
  IconPhoto,
  IconPlaylist,
  IconCalendarEvent,
  IconUsers,
  IconShield,
  IconDotsVertical,
  IconUser,
  IconList,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";

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
  DASHBOARD_ROUTE_READ_ENTRIES,
  getFirstPermittedAdminRoute,
} from "@/lib/route-permissions";
import type { ComponentType, ReactElement } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { PermissionType } from "@/types/permission";

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly permission: PermissionType;
}

const ICON_BY_PATH: Record<
  (typeof DASHBOARD_ROUTE_READ_ENTRIES)[number]["path"],
  ComponentType<{ className?: string }>
> = {
  "/admin/displays": IconDeviceDesktop,
  "/admin/content": IconPhoto,
  "/admin/playlists": IconPlaylist,
  "/admin/schedules": IconCalendarEvent,
  "/admin/users": IconUsers,
  "/admin/roles": IconShield,
};

const navItems: readonly NavItem[] = DASHBOARD_ROUTE_READ_ENTRIES.map(
  (entry) => ({
    title: entry.title,
    href: entry.path,
    permission: entry.permission,
    icon: ICON_BY_PATH[entry.path],
  }),
);

const extendedNavItems: readonly NavItem[] = [
  ...navItems,
  {
    title: "Logs",
    href: "/admin/logs",
    permission: "audit:read",
    icon: IconList,
  },
];

const CORE_PATHS = new Set<string>([
  "/admin/displays",
  "/admin/content",
  "/admin/playlists",
  "/admin/schedules",
]);
const MANAGE_PATHS = new Set<string>([
  "/admin/users",
  "/admin/roles",
  "/admin/logs",
]);

export function AppSidebar(): ReactElement {
  const pathname = usePathname();
  const { user, logout, can, isInitialized, permissions } = useAuth();
  const visibleNavItems = isInitialized
    ? extendedNavItems.filter((item) => can(item.permission))
    : [];
  const coreNavItems = visibleNavItems.filter((item) =>
    CORE_PATHS.has(item.href),
  );
  const manageNavItems = visibleNavItems.filter((item) =>
    MANAGE_PATHS.has(item.href),
  );
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const homeRoute =
    getFirstPermittedAdminRoute(permissions, user?.isRoot === true) ??
    "/unauthorized";
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = user?.avatarUrl ?? null;
  // Only render tooltips after client mount to avoid hydration mismatch
  // Radix Tooltip generates IDs that differ between server and client
  const mounted = useMounted();

  return (
    <Sidebar
      variant="floating"
      collapsible="offcanvas"
      className="pr-0"
      style={
        {
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
        } as CSSProperties
      }
    >
      <SidebarHeader className="flex flex-row items-center justify-between">
        <Link
          href={homeRoute}
          className="flex items-center gap-2 px-2 font-semibold text-primary-foreground"
        >
          <span className="text-xl tracking-tight">WILDFIRE</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {coreNavItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-primary-foreground/70">
              CORE
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {coreNavItems.map((item) => {
                  const isActive = pathname === item.href;
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
        ) : null}

        {manageNavItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-primary-foreground/70">
              MANAGE
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {manageNavItems.map((item) => {
                  const isActive = pathname === item.href;
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
        ) : null}
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
                      {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt="User Avatar"
                          width={48}
                          height={48}
                          className="size-7 rounded-full object-cover"
                          unoptimized
                          onError={() => setFailedAvatarUrl(avatarUrl)}
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
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <IconSettings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
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
