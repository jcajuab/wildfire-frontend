import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import { AppLayout } from "@/components/layout/app-layout";

vi.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: () => <aside aria-label="Sidebar" />,
}));

vi.mock("@/components/layout/mobile-header", () => ({
  MobileHeader: () => <header>Mobile header</header>,
}));

vi.mock("@/components/layout/admin-event-provider", () => ({
  AdminEventProvider: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { readonly children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

describe("AppLayout", () => {
  test("temporarily omits the AI assistant bubble", () => {
    render(
      <AppLayout>
        <div>Dashboard content</div>
      </AppLayout>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "AI assistant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open WILDFIRE AI" }),
    ).not.toBeInTheDocument();
  });
});
