import type { ReactElement, ReactNode } from "react";
import { AuthGuard, PageReadGuard } from "@/components/layout";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): ReactElement {
  return (
    <AuthGuard>
      <PageReadGuard>{children}</PageReadGuard>
    </AuthGuard>
  );
}
