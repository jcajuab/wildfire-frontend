"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { useGlobalEmergency } from "@/hooks/use-global-emergency";

interface GlobalEmergencyButtonProps {
  variant: "sidebar" | "compact";
}

export function GlobalEmergencyButton({
  variant,
}: GlobalEmergencyButtonProps): ReactElement | null {
  const { user } = useAuth();
  const { isActive, isBusy, canRead, canUpdate, handleToggle } =
    useGlobalEmergency();

  if (!user?.isAdmin || !canRead) {
    return null;
  }

  const label = isBusy
    ? "Updating..."
    : isActive
      ? "Stop Emergency"
      : "Start Emergency";

  if (variant === "sidebar") {
    return (
      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="default"
              onClick={handleToggle}
              disabled={!canUpdate || isBusy}
              className={
                isActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground [&_svg]:text-destructive-foreground"
                  : "bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-destructive/80 hover:text-destructive-foreground [&_svg]:text-sidebar-foreground hover:[&_svg]:text-destructive-foreground"
              }
            >
              <IconAlertTriangle className="size-4" />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <Button
      variant={isActive ? "destructive" : "ghost"}
      size="icon"
      disabled={!canUpdate || isBusy}
      onClick={handleToggle}
      aria-label={isActive ? "Stop Emergency" : "Start Emergency"}
    >
      <IconAlertTriangle />
    </Button>
  );
}
