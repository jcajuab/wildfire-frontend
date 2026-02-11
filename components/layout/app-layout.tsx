"use client";

import type { ReactElement, ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

interface AppLayoutProps {
  readonly children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): ReactElement {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main-content" className="flex flex-col">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
