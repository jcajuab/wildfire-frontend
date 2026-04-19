"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";

const AIChatBubble = dynamic(
  () =>
    import("@/components/ai/ai-chat-bubble").then((m) => m.AIChatBubble),
  { ssr: false },
);

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
        <MobileHeader />
        <main
          id="main-content"
          className="flex h-svh min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30 p-2 pt-16 md:pt-2"
        >
          {children}
        </main>
        <aside aria-label="AI assistant">
          <AIChatBubble />
        </aside>
      </SidebarProvider>
    </TooltipProvider>
  );
}
