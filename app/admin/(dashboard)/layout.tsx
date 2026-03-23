// SSR optimization opportunity: dashboard pages are currently "use client".
// Individual pages can be migrated to server components as data-fetching
// moves to server actions, reducing client JS bundle size.
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DashboardShellLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardShellLayout({
  children,
}: DashboardShellLayoutProps): ReactElement {
  return <AppLayout>{children}</AppLayout>;
}
