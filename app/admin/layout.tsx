import type { ReactElement, ReactNode } from "react";
import { AuthCacheSync } from "@/components/layout/auth-cache-sync";
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
      <AuthCacheSync />
      <AuthGuard>
        <PageReadGuard>{children}</PageReadGuard>
      </AuthGuard>
    </StoreProvider>
  );
}
