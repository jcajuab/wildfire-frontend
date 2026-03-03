import type { ReactElement, ReactNode } from "react";
import { AppLayout } from "@/components/layout";

interface DashboardShellLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardShellLayout({
  children,
}: DashboardShellLayoutProps): ReactElement {
  return <AppLayout>{children}</AppLayout>;
}
