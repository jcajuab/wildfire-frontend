"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconShieldLock } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

const ROUTE_PERMISSION_MAP: Readonly<Record<string, string>> = {
  "/roles": "roles:read",
  "/users": "users:read",
  "/content": "content:read",
  "/playlists": "playlists:read",
  "/schedules": "schedules:read",
  "/displays": "devices:read",
} as const;

interface PageReadGuardProps {
  readonly children: React.ReactNode;
}

/**
 * Wraps dashboard content and shows an access-denied view when the user
 * navigates to a resource route without the required read permission.
 */
export function PageReadGuard({ children }: PageReadGuardProps): React.ReactElement {
  const pathname = usePathname();
  const { can } = useAuth();

  const requiredPermission = ROUTE_PERMISSION_MAP[pathname ?? ""];
  const hasAccess =
    requiredPermission === undefined || can(requiredPermission);

  if (!hasAccess && requiredPermission !== undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          title="You don't have access to this page"
          description="You need permission to view this section. Go back to the dashboard or contact your administrator."
          icon={<IconShieldLock className="size-12 text-muted-foreground" />}
          action={
            <Button asChild variant="default">
              <Link href="/">Go to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
