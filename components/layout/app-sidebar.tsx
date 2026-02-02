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

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

const navItems: readonly NavItem[] = [
  { title: "Displays", href: "/displays", icon: IconDeviceDesktop },
  { title: "Content", href: "/content", icon: IconPhoto },
  { title: "Playlists", href: "/playlists", icon: IconPlaylist },
  { title: "Schedules", href: "/schedules", icon: IconCalendarEvent },
  { title: "Users", href: "/users", icon: IconUsers },
  { title: "Roles", href: "/roles", icon: IconShield },
] as const;

export function AppSidebar(): React.ReactElement {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  // Only render tooltips after client mount to avoid hydration mismatch
  // Radix Tooltip generates IDs that differ between server and client
  const mounted = useMounted();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between">
        {state === "expanded" ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-2 px-2 font-semibold text-primary"
            >
              <span className="text-lg tracking-tight">WILDFIRE</span>
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
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-muted">
                      <IconUser className="size-4" />
                    </div>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="text-xs font-medium">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground">
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
                <DropdownMenuItem asChild>
                  <Link href="/logs">
                    <IconList className="size-4" />
                    Logs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
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
