"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  IconCalendarEvent,
  IconDeviceTv,
  IconDotsVertical,
  IconLoader2,
  IconPhoto,
  IconList,
  IconPlaylist,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType, MouseEvent, ReactElement } from "react";
import { useMemo, useOptimistic, useTransition } from "react";

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
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import { GlobalEmergencyButton } from "@/components/layout/global-emergency-button";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/context/auth-context";
import {
  getRoutesBySection,
  isPathMatch,
  getFirstVisibleAdminRoute,
  isSidebarRouteVisible,
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
const NAV_BUTTON_CLASS =
  "h-8 rounded-md px-2.5 text-sidebar-foreground/88 transition-[background-color,color] hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-foreground/95 data-[active=true]:font-medium data-[active=true]:text-primary data-[active=true]:shadow-sm data-[active=true]:hover:bg-sidebar-foreground/95 data-[active=true]:hover:text-primary [&_svg]:text-sidebar-foreground/80 data-[active=true]:[&_svg]:text-primary data-[active=true]:hover:[&_svg]:text-primary aria-disabled:opacity-100";
const SECTION_LABEL_CLASS =
  "h-auto px-2 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.12em] text-sidebar-foreground/62";

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
    .filter((entry) => isSidebarRouteVisible(entry, can))
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
  const router = useRouter();
  const { user, can, isInitialized } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const [optimisticPathname, setOptimisticPathname] = useOptimistic(pathname);

  /** Intercept click: `AdminNavLink` prefetches on hover/focus only; use
   *  startTransition for navigation so we get isPending state. */
  function handleNavClick(e: MouseEvent, href: string): void {
    e.preventDefault();
    if (isPending) return;
    startTransition(() => {
      setOptimisticPathname(href);
      router.push(href);
      if (isMobile) setOpenMobile(false);
    });
  }

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
        ? (getFirstVisibleAdminRoute(can) ?? UNAUTHORIZED_ROUTE)
        : UNAUTHORIZED_ROUTE,
    [can, isInitialized],
  );
  const displayName = user?.name ?? "User";
  const displayEmail =
    user?.email ?? (user?.username ? `@${user.username}` : "");

  return (
    <Sidebar variant="floating" collapsible="offcanvas" className="pr-0">
      <SidebarHeader className="px-4 pb-3 pt-4">
        <AdminNavLink
          href={homeRoute}
          aria-label="Home"
          className="flex min-h-10 items-center rounded-md text-sidebar-foreground outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <WildfireLogo className="h-6 w-auto" />
        </AdminNavLink>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 pb-3">
        <nav aria-label="Main navigation">
          {coreNavItems.length > 0 ? (
            <SidebarGroup className="px-0 py-4">
              <SidebarGroupLabel className={SECTION_LABEL_CLASS}>
                {CORE_SECTION}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  {coreNavItems.map((item) => {
                    const isNavPending =
                      isPending &&
                      isActiveRoute(optimisticPathname, item.href, item.match);
                    const isDisabled =
                      isPending &&
                      !isActiveRoute(optimisticPathname, item.href, item.match);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          size="default"
                          isActive={isActiveRoute(
                            pathname,
                            item.href,
                            item.match,
                          )}
                          className={NAV_BUTTON_CLASS}
                          tooltip={item.title}
                        >
                          <AdminNavLink
                            href={item.href}
                            aria-disabled={isDisabled || undefined}
                            className={
                              isDisabled ? "pointer-events-none" : undefined
                            }
                            onClick={(e) => handleNavClick(e, item.href)}
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                            {isNavPending && (
                              <IconLoader2 className="ml-auto size-3.5 animate-spin" />
                            )}
                          </AdminNavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {manageNavItems.length > 0 ? (
            <SidebarGroup className="px-0 py-4">
              <SidebarGroupLabel className={SECTION_LABEL_CLASS}>
                {MANAGE_SECTION}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  {manageNavItems.map((item) => {
                    const isNavPending =
                      isPending &&
                      isActiveRoute(optimisticPathname, item.href, item.match);
                    const isDisabled =
                      isPending &&
                      !isActiveRoute(optimisticPathname, item.href, item.match);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          size="default"
                          isActive={isActiveRoute(
                            pathname,
                            item.href,
                            item.match,
                          )}
                          className={NAV_BUTTON_CLASS}
                          tooltip={item.title}
                        >
                          <AdminNavLink
                            href={item.href}
                            aria-disabled={isDisabled || undefined}
                            className={
                              isDisabled ? "pointer-events-none" : undefined
                            }
                            onClick={(e) => handleNavClick(e, item.href)}
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                            {isNavPending && (
                              <IconLoader2 className="ml-auto size-3.5 animate-spin" />
                            )}
                          </AdminNavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </nav>

        {!isMobile ? <GlobalEmergencyButton variant="sidebar" /> : null}
      </SidebarContent>

      {!isMobile ? (
        <SidebarFooter className="px-3 py-3">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <UserMenu
                menuSide="right"
                menuAlign="end"
                menuSideOffset={12}
                menuAlignOffset={-4}
                menuContentClassName="min-w-52"
                avatarSize={28}
                avatarWrapperClassName="size-7"
                fallbackIconClassName="size-6 text-sidebar-foreground"
                trigger={({ avatar }) => (
                  <SidebarMenuButton
                    size="lg"
                    className="h-12 w-full justify-between rounded-md px-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {avatar}
                      <div className="flex min-w-0 flex-col items-start">
                        <span className="truncate text-sm font-medium leading-5">
                          {displayName}
                        </span>
                        <span className="truncate text-xs leading-5 text-sidebar-foreground/72">
                          {displayEmail}
                        </span>
                      </div>
                    </div>
                    <IconDotsVertical
                      className="size-4 shrink-0 text-sidebar-foreground/70"
                      aria-hidden="true"
                    />
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
