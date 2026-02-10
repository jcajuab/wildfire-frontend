"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main-content" className="flex flex-col">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
