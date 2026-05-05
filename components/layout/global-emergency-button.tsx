"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactElement } from "react";

import { EmergencySlotDropdown } from "@/components/emergency/emergency-slot-dropdown";
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
  const { isActive, isBusy, canRead, canUpdate, deactivate } =
    useGlobalEmergency();

  if (!user?.isAdmin || !canRead) {
    return null;
  }

  const label = isBusy
    ? "Updating..."
    : isActive
      ? "Stop Emergency"
      : "Manage Emergencies";

  if (variant === "sidebar") {
    if (isActive) {
      return (
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="default"
                disabled={!canUpdate || isBusy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground [&_svg]:text-destructive-foreground"
                onClick={() => {
                  void deactivate();
                }}
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
      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <EmergencySlotDropdown
              trigger={
                <SidebarMenuButton
                  size="default"
                  disabled={!canUpdate || isBusy}
                  className={
                    isActive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground [&_svg]:text-destructive-foreground"
                      : "border border-sidebar-foreground/35 bg-sidebar/70 text-sidebar-foreground hover:border-transparent hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground focus-visible:border-sidebar-foreground/45 [&_svg]:text-sidebar-foreground"
                  }
                >
                  <IconAlertTriangle className="size-4" />
                  <span>{label}</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  if (isActive) {
    return (
      <Button
        variant="destructive"
        size="icon"
        disabled={!canUpdate || isBusy}
        aria-label="Stop Emergency"
        onClick={() => {
          void deactivate();
        }}
      >
        <IconAlertTriangle />
      </Button>
    );
  }

  return (
    <EmergencySlotDropdown
      trigger={
        <Button
          variant={isActive ? "destructive" : "ghost"}
          size="icon"
          disabled={!canUpdate || isBusy}
          aria-label={isActive ? "Stop Emergency" : "Manage Emergencies"}
          className={
            isActive
              ? undefined
              : "border border-border bg-background/80 hover:bg-muted hover:text-foreground"
          }
        >
          <IconAlertTriangle />
        </Button>
      }
    />
  );
}
