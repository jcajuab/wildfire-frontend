"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  readonly children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): ReactElement {
  return (
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
        <main
          id="main-content"
          className="flex min-h-svh w-full flex-1 flex-col bg-background md:p-2"
        >
          {children}
        </main>
      </SidebarProvider>
    </TooltipProvider>
  );
}
