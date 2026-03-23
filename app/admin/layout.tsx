import type { ReactElement, ReactNode } from "react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { PageReadGuard } from "@/components/layout/page-read-guard";
import StoreProvider from "@/lib/StoreProvider";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): ReactElement {
  return (
    <StoreProvider>
      <AuthGuard>
        <PageReadGuard>{children}</PageReadGuard>
      </AuthGuard>
    </StoreProvider>
  );
}
