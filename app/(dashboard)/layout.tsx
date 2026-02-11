import type { ReactElement, ReactNode } from "react";
import { AppLayout, AuthGuard, PageReadGuard } from "@/components/layout";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): ReactElement {
  return (
    <AuthGuard>
      <AppLayout>
        <PageReadGuard>{children}</PageReadGuard>
      </AppLayout>
    </AuthGuard>
  );
}
