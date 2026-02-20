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
  IconUserCircle,
  IconList,
  IconLogout,
} from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { useAuth } from "@/context/auth-context";
import { DASHBOARD_ROUTE_READ_ENTRIES } from "@/lib/route-permissions";
import type { ComponentType, ReactElement } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly permission: string;
}

const ICON_BY_PATH: Record<
  (typeof DASHBOARD_ROUTE_READ_ENTRIES)[number]["path"],
  ComponentType<{ className?: string }>
> = {
  "/displays": IconDeviceDesktop,
  "/content": IconPhoto,
  "/playlists": IconPlaylist,
  "/schedules": IconCalendarEvent,
  "/users": IconUsers,
  "/roles": IconShield,
};

const navItems: readonly NavItem[] = DASHBOARD_ROUTE_READ_ENTRIES.map(
  (entry) => ({
    title: entry.title,
    href: entry.path,
    permission: entry.permission,
    icon: ICON_BY_PATH[entry.path],
  }),
);

export function AppSidebar(): ReactElement {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user, logout, can, isInitialized } = useAuth();
  const visibleNavItems = isInitialized
    ? navItems.filter((item) => can(item.permission))
    : [];
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = user?.avatarUrl ?? null;
  // Only render tooltips after client mount to avoid hydration mismatch
  // Radix Tooltip generates IDs that differ between server and client
  const mounted = useMounted();

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "4rem",
        } as CSSProperties
      }
    >
      <SidebarHeader className="flex flex-row items-center justify-between">
        {state === "expanded" ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-2 px-2 font-semibold text-primary"
            >
              <span className="text-xl tracking-tight">WILDFIRE</span>
            </Link>
            <SidebarTrigger />
          </>
        ) : (
          <SidebarTrigger className="mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive}
                      className="text-base leading-6 [&_svg]:size-5"
                      tooltip={mounted ? item.title : undefined}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
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
                        <IconUser className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium leading-5">
                        {displayName}
                      </span>
                      <span className="truncate text-xs leading-4 text-muted-foreground">
                        {displayEmail}
                      </span>
                    </div>
                  </div>
                  <IconDotsVertical className="size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <IconUserCircle className="size-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                {can("audit:read") && (
                  <DropdownMenuItem asChild>
                    <Link href="/logs">
                      <IconList className="size-4" />
                      Logs
                    </Link>
                  </DropdownMenuItem>
                )}
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
      <SidebarRail />
    </Sidebar>
  );
}
