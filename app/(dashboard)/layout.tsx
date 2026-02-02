import { AppLayout, AuthGuard } from "@/components/layout";

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): React.ReactElement {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
