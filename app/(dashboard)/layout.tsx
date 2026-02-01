import { AppLayout, AuthGuard } from "@/components/layout";
import { AppProvider } from "@/context/app-context";

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): React.ReactElement {
  return (
    <AuthGuard>
      <AppProvider>
        <AppLayout>{children}</AppLayout>
      </AppProvider>
    </AuthGuard>
  );
}
