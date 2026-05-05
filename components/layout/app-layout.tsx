"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { AdminEventProvider } from "@/components/layout/admin-event-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  readonly children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): ReactElement {
  return (
    <AdminEventProvider>
      <TooltipProvider>
        <SidebarProvider
          open
          style={
            {
              "--sidebar-width": "15.5rem",
              "--sidebar-width-icon": "4rem",
            } as CSSProperties
          }
        >
          <AppSidebar />
          <MobileHeader />
          <main
            id="main-content"
            className="flex h-svh min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30 p-2 pt-16 md:pt-2"
          >
            {children}
          </main>
          {/* Temporarily removed while the AI assistant bubble is reworked. */}
        </SidebarProvider>
      </TooltipProvider>
    </AdminEventProvider>
  );
}
