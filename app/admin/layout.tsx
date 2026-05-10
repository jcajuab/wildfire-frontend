import { Suspense, type ReactElement, type ReactNode } from "react";
import { AuthCacheSync } from "@/components/layout/auth-cache-sync";
import { AuthGuard } from "@/components/layout/auth-guard";
import { AuthSessionSeeder } from "@/components/layout/auth-session-seeder";
import { PageReadGuard } from "@/components/layout/page-read-guard";
import StoreProvider from "@/lib/StoreProvider";
import { getCachedServerSession } from "@/lib/server/auth";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): ReactElement {
  return (
    <Suspense fallback={null}>
      <DashboardAuthShell>{children}</DashboardAuthShell>
    </Suspense>
  );
}

async function DashboardAuthShell({
  children,
}: DashboardLayoutProps): Promise<ReactElement> {
  const sessionResult = await getCachedServerSession();
  const session =
    sessionResult.status === "ok"
      ? {
          type: "bearer" as const,
          accessToken: sessionResult.session.accessToken,
          accessTokenExpiresAt: sessionResult.session.accessTokenExpiresAt,
          user: sessionResult.session.user,
          permissions: sessionResult.session.permissions,
        }
      : null;

  return (
    <StoreProvider>
      <AuthSessionSeeder session={session} />
      <AuthCacheSync />
      <AuthGuard>
        <PageReadGuard>{children}</PageReadGuard>
      </AuthGuard>
    </StoreProvider>
  );
}
