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

interface UserInfo {
  readonly name: string;
  readonly email: string;
}

// Mock user data - will be replaced with actual auth context
const currentUser: UserInfo = {
  name: "Admin",
  email: "john.doe@example.com",
};

export function AppSidebar(): React.ReactElement {
  const pathname = usePathname();
  const { state } = useSidebar();
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
                      <span className="text-xs font-medium">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {currentUser.email}
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
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
